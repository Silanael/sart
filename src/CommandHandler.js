// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CommandHandler.js - 2021-12-07_01
//
// Base class for a command-implementation.
//

const Sys     = require ("./System");
const Util    = require ("./Util");
const SARTDef = require ("./SARTDefinition");




class CommandHandler extends SARTDef
{   
    Aliases       = []; 
    MinArgsAmount = 0;
    Subcommands   = {};
        
    Helplines     = [];

    ExecFunc      = null;
    OutFunc       = null;
    

    /* Overrsidable, this implementation does nothing. */
    async OnExecute (args, cmd) { if (this.ExecFunc != null) return await this.ExecFunc (args, cmd); else return true; }
    async OnOutput  (args, cmd) { if (this.OutFunc  != null) return await this.OutFunc  (args, cmd); else return true; }    


    constructor (command_name)
    {
        super (command_name);
    }   


    WithAliases           (...aliases)    { this.Aliases = this.Aliases.concat (aliases); return this; }
    WithMinArgsAmount     (amount)        { this.MinArgsAmount = amount;                  return this; }
    WithFunc              (exec, out)     { this.ExecFunc      = exec; 
                                            this.OutFunc       = out;                     return this; }
    WithHelpLines         (helplines)     { this.Helplines     = helplines;               return this; }
    WithSubcommands       (subcommands)   { this.SubCommands   = subcommands;             return this; }
   
    GetMinArgsAmount      ()              { return this.MinArgsAmount; }
    GetSubcommands        ()              { return this.SubCommands;   }
    HasSubcommands        ()              { return this.SubCommands != null ? Object.keys (this.SubCommands)?.length > 0 : false; }
    toString              ()              { return this.GetName (); }

    GetSubcommand         (subcmd)        { return CommandHandler.GET_HANDLER (this.Subcommands, subcmd); }


    HasName (name)
    {        
        
        if (name == null)
            return false;

        else if (super.HasName (name) )
            return true;

        else for (const a of this.Aliases)
        {                        
            if (a != null && Util.StrCmp (name, a, true) )
                return true;
        }        
        return false;
    }


    DisplayHelp ()
    {
        const desc = this.GetDescription ();

        if (desc != null)
            Sys.INFO (desc);

        else if (this.Helplines.length <= 0)
            Sys.ERR ("No help available for command '" + this.GetName () + "'.");

        for (const l of this.Helplines)
        {
            Sys.INFO (l);         
        }

        if (this.SubCommands != null && this.SubCommands.length > 0)
            Sys.INFO ("Valid subcommands: " + Util.KeysToStr (this.SubCommands) );
                    
    }

 

    static GET_HANDLER (commands, name)
    {    
        if (commands == null)
        {            
            Sys.ERR_PROGRAM ("'commands' null!", "CommandHandler.GET_HANDLER");
            return null;
        }

        if (name == null)
            return null;

        for (const o of Object.entries (commands) )
        {               
            const key     = o[0];
            const handler = o[1];
    
            if (o != null && (Util.StrCmp (key, name, true) || (handler?.HasName != null && handler.HasName (name) )  ) )
            {
                Sys.DEBUG ("Command handler found for '" + name + '".');
                return handler;        
            }
        }
        Sys.DEBUG ("No command-handler found for '" + name + "'");
        return null;
    }
}






module.exports = CommandHandler;