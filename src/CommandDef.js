const SARTDef      = require ("./SARTDefinition");
const Arguments    = require ("./Arguments");
const Util         = require ("./Util");
const Sys          = require ("./System");
const { SETTINGS } = require ("./SETTINGS");





class CommandDef extends SARTDef
{   

    MinArgsAmount     = 0;
    
    ArgDefs           = new Arguments.ArgDefs ();
    Subcommands       = {};
        
    Helplines         = [];
    OutputObjectClass = null;
    
    MatchFunc         = null; // Should be a function (param_str).
    ExecFunc          = null;
    OutFunc           = null;
    AsActiveCommand   = true;
    AsListByDefault   = false;


    /* Overridable, these implementations do nothing. */
    async OnExecute           (cmd_instance)  { if (this.ExecFunc != null) return await this.ExecFunc (cmd_instance); else return true; }
    async OnOutput            (cmd_instance)  { if (this.OutFunc  != null) return await this.OutFunc  (cmd_instance); else return true; }    
          GetCustomSubCommand (next_arg_peek) { return null; }
     

    constructor (command_name)
    {
        super (command_name);
    }   
    

    WithArgs              (...argdefs)  { this.ArgDefs.AddAll (...argdefs); }    
    WithWantedFiedldsArg  ()            { this.WithArgs (new ArgDef ("fields").WithHasParam ().WithAlias ("f").WithFunc (CommandDef._HandleWantedFields) ); }
    WithMinArgsAmount     (amount)      { this.MinArgsAmount         = amount;            return this; }
    WithMatchFunc         (func)        { this.MatchFunc             = func;              return this; }
    WithFunc              (exec, out)   { this.ExecFunc              = exec; 
                                          this.OutFunc               = out;               return this; }
    WithHelpLines         (helplines)   { this.Helplines             = helplines;         return this; }
    WithSubcommands       (subcommands) { this.Subcommands           = subcommands;       return this; }
    WithAsListByDefault   ()            { this.AsListByDefault       = true;              return this; }
    WithAsEntriesByDefault()            { this.AsListByDefault       = false;             return this; }
    WithOutputObjectClass (sart_obj_cl) { this.OutputObjectClass     = sart_obj_cl;       return this; }

    GetMinArgsAmount      ()            { return this.MinArgsAmount; }
    GetSubcommands        ()            { return this.Subcommands;   }
    HasSubcommands        ()            { return this.Subcommands != null ? Object.keys (this.Subcommands)?.length > 0 : false; }
    GetOutputObjectClass  ()            { return this.OutputObjectClass; }
    HasOutputObjectClass  ()            { return this.OutputObjectClass != null; }
    RunAsActiveCommand    ()            { return this.AsActiveCommand == true; }
    toString              ()            { return this.GetName (); }
    
    IsOutputAsList        (cmd)         { const s = cmd.GetEffectiveSetting (SETTINGS.OutputAsList); return s != null ? s : this.AsListByDefault; }
    GetWantedFields       (cmd)         { return cmd.GetWantedFields (); }
  
    

    Matches (name)
    {                        
        if (name == null)
            return false;

        else if (this.HasName (name) )
            return true;

        else if (this.MatchFunc != null && this.MatchFunc (name) )
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

        if (this.HasOutputObjectClass () )
        {            
            const fieldnames = this.GetOutputObjectClass ()?.GET_ALL_FIELD_DEFS?.GetNamesAsStr ();
            if (fieldnames != null)
            {
                Sys.INFO ("");
                Sys.INFO ("Fields: " + fieldnames);
            }
        }

        if (this.HasSubcommands () )
        {
            Sys.INFO ("");
            Sys.INFO ("Subcommands: " + Util.KeysToStr (this.Subcommands) );
        }
                    
    }
    
    static _HandleWantedFields (param, cmd)
    {        
        cmd.WantedFields = param?.split (Sys.GetMain ()?.GetSetting (SETTINGS.MultiInputSeparatorChr) );
    }

}


class MessageCMD extends CommandDef { constructor (name, msg) { super (name); this.Message = msg;} OnOutput (c) { Sys.INFO (this.Message); } }

class SettingCMD extends CommandDef
{
    Key    = null;
    Value  = null;

    constructor (name, key, value)
    {
        super (name);
        this.Key   = key;
        this.Value = value;
        this.MinArgsAmount = value != null ? 0 : 1;
    }
    
    OnExecute (cmd_instance)
    {
        const value = this.Value != null ? this.Value : cmd_instance.Pop ();

        if ( Sys.GetMain ()?.SetGlobalSetting (this.Key, value) )
            Sys.INFO ("Global setting '" + this.Key + "' set to '" + value + "'.");

        else            
            cmd_instance.OnError ("Failed to set global setting '" + this.Key + " to '" + value + "'.");
    }
}



module.exports = { CommandDef, MessageCMD, SettingCMD };

