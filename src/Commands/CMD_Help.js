//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CMD_Help.js - 2021-12-08_01
// Command 'HELP'
//


const Util       = require ("../Util");
const Sys        = require ("../System");
const CommandDef = require ("../CommandDef").CommandDef;
const SARTObject = require("../SARTObject");



class CMD_Help extends CommandDef
{
    
    constructor ()
    {
        super ("HELP");    
        this.MinArgsAmount = 0;
        this.WithDescription ("Displays help on how to use SART and its commands.");
    }


    OnExecute (cmd)
    {
        return true;        
    }


    OnOutput (cmd)
    {
        const cmd_req =  cmd.PopLC ();

        // Requested command present.
        if (cmd_req != null)
        {            
            const handler = Sys.GetMain ().GetCommandDef (cmd_req, cmd.GetArgs () );
    
            if (handler != null)
                this.DisplayHelpForCommandHandler (handler);

            else
                Sys.ERR ("Command '" + cmd_req + "' not recognized.", this);
        } 
    
        else
        {
            const headerstr     = "Silanael ARweave Tool";
            const versionstring = Util.GetVersionStr ();
    
            const longestlen = headerstr.length > versionstring.length ? headerstr.length 
                                                                       : versionstring.length;
            const linelen = longestlen + 4;
    
            Sys.INFO ("".padStart (linelen,   "#"));
            Sys.INFO ("# " + headerstr    .padEnd (longestlen, " ") + " #");
            Sys.INFO ("# " + versionstring.padEnd (longestlen, " ") + " #");    
            Sys.INFO ("".padStart (linelen,   "#"));    
            Sys.INFO ("");
            Sys.INFO ("Usage: sart [OPTION] [COMMAND] [PARAM]");
            Sys.INFO ("");
    
            Sys.INFO (">>> DEVELOPMENT VERSION <<<")
            Sys.INFO ("")
    
            Sys.INFO ("COMMANDS:");
            Sys.INFO ("");
            Sys.INFO ("  -l, list    [TARGET]     List /*Arweave- or*/ ArDrive-content.");
            Sys.INFO ("  -g, get     [TARGET]     Get (more or less) raw data (TX-data, files etc.)");
            Sys.INFO ("  -i, info    [TARGET]     Obtain detailed information about the target.");
            Sys.INFO ("  -s, status  [TARGET]     Obtain the current status of the target.");
            Sys.INFO ("      verify               Verify that ArFS-files are uploaded correctly.")
            Sys.INFO ("      console              Enter the console. This is the default command.")
            Sys.INFO ("    , pending              Display network pending TX amount.");
            Sys.INFO ("  -v, version              Display version info.");
            Sys.INFO ("      help    [COMMAND]    Display help for a command.");
            Sys.INFO ("      readme               Display a detailed user guide.");
            Sys.INFO ("");
            Sys.INFO ("CONSOLE:");
            Sys.INFO ("");
            Sys.INFO ("      connect [URL]        Connect to an Arweave-node or gateway.")
            Sys.INFO ("      set [CONF] [VALUE]   Set a config key to desired value. Case-sensitive.");
            Sys.INFO ("                           Use 'GET CONFIG' to get a list of config keys and their values.");
            Sys.INFO ("      date (UNIXTIME)      Get the current date or convert UNIX-time to human-readable form.");
            Sys.INFO ("      size [bytes]         Convert amount of bytes to human-readable form (1K = 1024).");
            Sys.INFO ("      exit                 Exit the console.")        
            Sys.INFO ("");
            Sys.INFO ("OPTIONS:");        
            Sys.INFO ("");
            Sys.INFO ("      --config-file [FILE] Load a config file in JSON-format. Can be saved with 'GET CONFIG' > file.");
            Sys.INFO ("      --quiet              Output only data, no messages or errors.");
            Sys.INFO ("      --no-msg             Output only data/results and errors. Default for piped.");
            Sys.INFO ("      --msg                Display info on what's done. Default for non-piped.");
            Sys.INFO ("      --msg-stderr         Display info on what's done in STDERR. Use to monitor while piping.");
            Sys.INFO ("  -V, --verbose            Display extended runtime info.");
            Sys.INFO ("      --verbose-stderr     Display extended runtime info in STDERR. Use to monitor while piping.");
            Sys.INFO ("      --debug              Display extensive debugging info.");
            Sys.INFO ("      --debug-stderr       Display extensive debugging info in STDERR. Use to monitor while piping.");
            Sys.INFO ("      --stderr             Display info and warning messages in STDERR. Same as --msg-out stderr,");
            Sys.INFO ("                           but sets the LogLevel to >= MSG.");
            Sys.INFO ("      --msg-out [FLAGS]    Set destination for info-messages.  Flags: stdout,stderr,none");
            Sys.INFO ("      --err-out [FLAGS]    Set destination for error-messages. Flags: stdout,stderr,none");
            Sys.INFO ("      --no-ansi            Don't use ANSI codes in output.");
            Sys.INFO ("");
            Sys.INFO ("  -a, --all                Display all entries (moved, orphaned etc.).");
            Sys.INFO ("  -r, --recursive          Do a recursive listing (drive listings are by default).");
            Sys.INFO ("      --less-filters       Try to retrieve omitted entries by lowering the search criteria.");
            Sys.INFO ("                           Disables Config.ArFSTXQueryTags + TX- and ArFS-minimum versions.");
            Sys.INFO ("      --force              Override abort on some fatal errors.");
            Sys.INFO ("  -h, --host               Arweave gateway to use. Can include port and proto.");
            Sys.INFO ("      --port               Arweave gateway port.");
            Sys.INFO ("      --proto              Arweave gateway protocol, ie. 'https'.");
            Sys.INFO ("      --timeout-ms         HTTP request timeout. Default is 100000.");
            Sys.INFO ("      --concurrent-ms      Interval between concurrent requests. Default is 200. Increase if issues.");
            Sys.INFO ("      --retry-ms           Delay between retries upon errors. Default is 5000.");
            Sys.INFO ("      --fast               Sets the concurrency-delay to 50ms. May result in failed fetches on");
            Sys.INFO ("                           some connections. No, it won't make the current LIST any faster.");
            Sys.INFO ("      --retries            Amount of retries for failed data fetch per entry. Default is 3.");
            Sys.INFO ("  -f, --format             Output data format. Valid formats: txt, json, csv");
            Sys.INFO ("      --min-block [HEIGHT] Add 'block: { min:[HEIGHT] }' to the GQL-queries.");
            Sys.INFO ("      --max-block [HEIGHT] Add 'block: { max:[HEIGHT] }' to the GQL-queries.");
            Sys.INFO ("                           The current block height is 817872 upon writing this.");
            Sys.INFO ("");
            Sys.INFO ("(Use README to get a more detailed usage instructions)");
        }        
    }


    DisplayHelpForCommandHandler (handler)
    {
        if (handler == null)
            return Sys.ERR_PROGRAM ("'handler' null.", "CMD_Help.DisplayHelpForCommandHandler");

        const help_data = [];

        help_data.Description = handler.GetDescription ();
        help_data.Usage       = handler.Helplines;

        if (handler.HasOutputObjectClass () )
        {        
            help_data.OutputClass = handler.GetOutputObjectClass ();                
            help_data.Fields      = help_data.OutputClass.GET_ALL_FIELDNAMES_STR        ();
            help_data.Fetches     = help_data.OutputClass.GET_ALL_AVAILABLE_FETCHES_STR ();
            
        }
    
        if (handler.HasSubcommands () )
            help_data.Subcommands = Util.KeysToStr (handler.GetSubcommands () ); 


        SARTObject.FROM_JSOBJ (help_data)?.Output ();
             
    }

}


module.exports = CMD_Help;