# Debugging on Mono
Unfortunately, [Visual Studio Code](https://code.visualstudio.com/) does still not offer ASP.NET 5 debugging support. You can get around it by debugging Mono yourself. This requires you use a lower-level tool, such as GDB. 

##1. Setup GDB.

1. Install GDB with `brew install homebrew/dupes/gdb`
2. Codesign GDB. [Follow these instructions](http://wiki.freepascal.org/GDB_on_OS_X_Mavericks_and_Xcode_5#Codesigning_gdb) Tip: restart typegated with this command `sudo launchctl stop taskgated && sudo launchctl start taskgated`
3. Setup your GDB configuration according to [Debugging: Mono](http://www.mono-project.com/docs/debug+profile/debug/). My `~/.gdbfile` [looks like this.](https://gist.github.com/natemcmaster/fef1d9e66ae48cfd8baf)

##2. Find the mono and dnx.mono.managed.dll
Debugging requires you find the location several files. 
 - mono.  You can find this with `where mono`
 - dnx.mono.managed.dll. For example, this should be located in `/.dnx/runtimes/dnx-mono.1.0.0-(version)/bin/`.

##3. Start GDB

`gdb --args (mono path) --debug (path to dnx.mono.managed.dll) (normal dnx arguments)`

For example, the debugging equivalent of `dnx . test` on my machine is ` gdb --args ~/dev/mono-src/bin/mono --debug ~/.dnx/runtimes/dnx-mono.1.0.0-beta6-12189/bin/dnx.mono.managed.dll . test`

##4. Set a breakpoint
From the gdb prompt, you can add a breakpoint by using the `mono_debugger_insert_breakpoint` function.

`
(gdb) call mono_debugger_insert_breakpoint("", 0)
`

## More info

For an in-depth guide on using GDB, checkout Debug Thing's blogpost on [Debugging vNext](http://www.debugthings.com/2015/04/07/debugging-vnext-mono/)