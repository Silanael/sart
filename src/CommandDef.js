const SARTDef = require ("./SARTDefinition");
const Util    = require ("./Util");
const Sys     = require ("./System");


class CommandDef extends SARTDef
{   

    Aliases         = []; 
    MinArgsAmount   = 0;
    Subcommands     = {};
        
    Helplines       = [];

    ExecFunc        = null;
    OutFunc         = null;
    AsActiveCommand = true;
    

    /* Overrsidable, this implementation does nothing. */
    async OnExecute (cmd_instance) { if (this.ExecFunc != null) return await this.ExecFunc (cmd_instance); else return true; }
    async OnOutput  (cmd_instance) { if (this.OutFunc  != null) return await this.OutFunc  (cmd_instance); else return true; }    


    constructor (command_name)
    {
        super (command_name);
    }   


    WithAliases           (...aliases)    { this.Aliases = this.Aliases.concat (aliases); return this; }
    WithMinArgsAmount     (amount)        { this.MinArgsAmount = amount;                  return this; }
    WithFunc              (exec, out)     { this.ExecFunc      = exec; 
                                            this.OutFunc       = out;                     return this; }
    WithHelpLines         (helplines)     { this.Helplines     = helplines;               return this; }
    WithSubcommands       (subcommands)   { this.Subcommands   = subcommands;             return this; }
   
    GetMinArgsAmount      ()              { return this.MinArgsAmount; }
    GetSubcommands        ()              { return this.Subcommands;   }
    HasSubcommands        ()              { return this.Subcommands != null ? Object.keys (this.Subcommands)?.length > 0 : false; }
    RunAsActiveCommand    ()              { return this.AsActiveCommand == true; }
    toString              ()              { return this.GetName (); }


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

        if (this.HasSubcommands () )
        {
            Sys.INFO ("");
            Sys.INFO ("Valid subcommands: " + Util.KeysToStr (this.Subcommands) );
        }
                    
    }

}



module.exports = CommandDef;

