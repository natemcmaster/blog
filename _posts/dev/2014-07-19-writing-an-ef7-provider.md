---
layout: post
date: 2014-07-19 15:30:00 PST
title: Writing an EF7 Provider
author:
    name: Nate
keywords: entity framework microsoft azure storage coding
hero:
    url: https://farm6.staticflickr.com/5592/14778307563_fbdc53cfed_b.jpg
    height: 1024
    width: 413
tags:
  - entityframework-core
---

## Update

This content is stale. The EF7 was renamed to Entity Framework Core. You can find this information here now:

<https://docs.microsoft.com/en-us/ef/core/providers/writing-a-provider>

## Original post

I spent my summer internship at Microsoft to building a piece of software that allows Entity Framework 7 to connect with Azure Table Storage accounts.
In the process of creating this, I attempted to document the interface between the provider and the core APIs of EF. This post includes technical details that should enable third-parties to create their own provider for Entity Framework.

*Note: this content is accurate as of the today (July 19), but these APIs are subject to change. This content is also available on the [Entity Framework wiki.](https://github.com/aspnet/EntityFramework/wiki/Writing-an-EF7-Provider)*

EF provides a set of Core APIs and services that make it easier to manage the
interaction of in-memory objects and persistent data storage.
This core is agnostic of all data store specific details,
and is used by all of EF supported providers (SQL Server, SQLite, and Azure Table Storage).
Using these Core APIs, it is possible to create a provider for additional data store types.

An EF provider must implement a set of APIs to manage reading from and writing to
a persistent data store. See diagrams and reference below for some detail on how the classes interact
with the EF core.

### Requirements
EF providers must implement the following [abstract classes](#abstractclasses).

 - Infrastructure.DbContextOptionsExtension
 - Storage.DataStore
 - Storage.DataStoreConnection
 - Storage.DataStoreCreator
 - Storage.DataStoreSource

[Optional classes to override.](#optionaloverride)

 - Infrastructure.Database
 - Infrastructure.ValueGeneratorCache

(*All reference names in this document are relative to Microsoft.Data.Entity*)

### Recommended
To help end-users discover provider-specific features via IntelliSense, we [recommend
providing extension methods](#extensionmethods) on some of the default EF classes.

 - DbContextOptions
 - EntityServicesBuilder
 - Storage.Database

# Reference

## <a name="abstractclasses"></a> Abstract Classes

### Infrastructure.DbContextOptionsExtension
This class configures the dependency injection settings used in an instance of DbContext.
It is used during DbContext initialization to configure the DbContextOptions.

Methods required:
```c#
void ApplyServices(EntityServicesBuilder builder);
```

![DbContextOptionExtension](http://i.imgur.com/abu6gCh.png)

### Storage.Datastore
This class is the hub of activity for a provider.
A data store must implement these methods:

```c#
Task<int> SaveChangesAsync(IReadOnlyList<StateEntry> stateEntries,
                           CancellationToken cancellationToken);

IEnumerable<TResult> Query<TResult>(QueryModel queryModel,
                                    StateManager stateManager);

IAsyncEnumerable<TResult> AsyncQuery<TResult>(QueryModel queryModel,
                                              StateManager stateManager);
```

**SaveChanges** receives a list of entities which must be persisted to the data store.
Upon successful completion, return the number of entities successfully saved.
If an entity cannot be saved, this method should throw an exception containing
the reason why the action failed.

![Save changes workflow](http://i.imgur.com/chhMeSe.png)

**Query** receives a [QueryModel](#relinq) containing a query to execute against the data store.
This method should return an IEnumerable from the data store of all entites matching
the query model. QueryModel is a simplified, but equivalent expression tree that represents
the original LINQ query requested by user code on DbSet. (Thanks [relinq](#relinq)!)

![Query](http://i.imgur.com/FvUcYFZ.png)

### Storage.DataStoreConnection
This class manages connection settings and sessions.

Although an EF provider requires an implementation, the details of how the class
operates is *entirely up to the provider* i.e. time to freestyle. :snowboarder:

For example, SQL Server uses this class to open TCP/IP connections,
but SQLite uses this class to create connections to the local filesystem.

### Storage.DataStoreCreator
An implementation of requires implementation of the following methods.

```c#
bool       EnsureCreated(IModel model);
Task<bool> EnsureCreatedAsync(IModel model, CancellationToken cancellationToken);

bool       EnsureDeleted(IModel model);
Task<bool> EnsureDeletedAsync(IModel model, CancellationToken cancellationToken);
```

**EnsureCreated** ensures that the database/tables/containers needed to store
the model on the server exists and are write-accessible.
**EnsureDeleted** ensures the database/tables/containers are deleted.

Both methods *return true* when the method call changed something on the server &mdash;
e.g. created a new database, deleted a table &mdash; and *return false* when
the model has already been created/deleted.

![datastorecreator](http://i.imgur.com/Taun659.png)

### <a name="datastoresource"></a>Storage.DatastoreSource
This class configures Entity Framework to use provider-specific implementations
of theses classes:

 - Storage.DataStore
 - Infrastructure.DbContextOptionsExtension
 - Storage.DataStoreCreator
 - Storage.DataStoreConnection
 - Identity.ValueGeneratorCache :small_blue_diamond:
 - Storage.Database :small_blue_diamond:

:small_blue_diamond: These classes are not abstract. A default implementation has been provided.

![Datastoresource](http://i.imgur.com/nMQM7Dl.png)

Because this is fairly straightforward class, we have provided an abstract implementation that makes it
easier to use dependency injection.

#### DatastoreSource&lt;TDataStore, TDbContextOptionsExtension, TCreator, TConnection, TValueGeneratorCache, TDatabase&gt;
This generic class requests an implementation of the types classes from ServiceCollection.

![Datastoresource generic](http://i.imgur.com/rNucpFG.png)

## <a name="optionaloverride"></a> Optional Overrides
These classes do not *need* to be implemented, but they are a way to extend provider features.

### Infrastructure.Database
This class provides access to APIs custom to the database of the provider.
This class is best used as a proxy to DatastoreCreator which should contain the
logic for manipulating the structure of the data store.

Example: SQLite uses this to provide APIs for creating/deleting a database file.
In Azure Table Storage, it provides APIs for creating/deleting tables on the server.

### Infrastructure.ValueGeneratorCache
This class is used to control value generators.
Value generators are used by EF7 to populate fields, such as auto-incremented IDs, that are generated on the server or client.

## <a name="extensionmethods"></a>Recommended Extension Methods
These classes exist in EF's Core, but users may not know how to directly interact
with them to configure their application.
By creating custom extension methods, IntelliSense in Visual Studio will show users
custom methods to configure the provider.
IntelliSense works best the extension methods are defined in the namespace of the class they extend.

### DbContextOptions
Expose access to your provider within the *OnConfiguring* method of DbContext.
Your extension method should add your provider-specific implementation of
DbContextOptionsExtension to an instance of DbContextOptions.

:hammer: Power user note: To add a DbContextOptionsExtension to DbContextOptions,
you must first cast DbContextOptions to IDbContextOptionsExtensions, and then use
**IDbContextOptionsExtensions.AddOrUpdateExtension<T>()**.
We require this to keep IntelliSense clean for users, but still expose
APIs for EF provider developers.

Example: This will help users configure a context that connects to Azure Table Storage.
```c#
namespace Microsoft.Data.Entity
{
    public static class AtsDbContextExtensions
    {
        public static DbContextOptions UseAzureTableStorage(this DbContextOptions options,
                                                            string connectionString)
        {
            ((IDbContextOptionsExtensions)options).AddOrUpdateExtension<AtsOptionsExtension>(
                e =>
                    {
                        e.ConnectionString = connectionString;
                    });

            return options;
        }
    }
}
```


### EntityServicesBuilder
Expose access to dependency injection configuration. This extension should configure
DI to use provider-specific implementations.

Example: Configure DI to use Azure Table Storage's implementations
```c#
namespace Microsoft.Framework.DependencyInjection
{
    public static class EntityServicesBuilderExtensions
    {
        public static EntityServicesBuilder AddAzureTableStorage(this EntityServicesBuilder builder)
        {
          builder.ServiceCollection
                .AddSingleton<DataStoreSource, AtsDataStoreSource>()
                .AddSingleton<AtsQueryFactory>()
                .AddSingleton<TableEntityAdapterFactory>()
                .AddSingleton<AtsValueReaderFactory>()
                .AddScoped<AtsDatabase>()
                .AddScoped<AtsDataStore>()
                .AddScoped<AtsConnection>()
                .AddScoped<AtsDataStoreCreator>()
                .AddScoped<AtsValueGeneratorCache>();

            return builder;
        }
    }
}
```


### Storage.Database
Expose the provider-specific database calls with an extension method that
safely casts Storage.Database to the provider implementation.

Example: This will light-up the APIs unique to SQL. A user will see this extension method
listed in IntelliSense when accessing DbContext.Database
```c#
namespace Microsoft.Data.Entity
{
    public static class RelationalDatabaseExtensions
    {
        public static RelationalDatabase AsRelational(this Database database)
        {
            var relationalDatabase = database as RelationalDatabase;
            if (relationalDatabase == null)
            {
                throw new InvalidOperationException("RelationalDatabase not in use");
            }
            return relationalDatabase;
        }
    }
}
```



# Third-Party Libraries

### <a name="relinq"></a>Relinq
[relinq](http://relinq.codeplex.com) is a third party library used by Entity Framework to simplify interaction
with LINQ queries. All LINQ queries against DbSet run through a set of expression
tree visitors that have been simplified by relinq. A provider may read and/or
change the expression tree it receives in **Storage.Datastore.Query()**

Articles:

- [Getting Started with Re-linq](http://chris.eldredge.io/blog/2012/03/29/Getting-Started-With-Relinq/)
- [Re-linq blog posts](https://www.re-motion.org/blogs/mix/category/re-linq)

 ■
