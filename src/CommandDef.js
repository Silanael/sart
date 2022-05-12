const CONSTANTS    = require ("./CONSTANTS");
const SARTDef      = require ("./SARTDefinition");
const Util         = require ("./Util");
const Sys          = require ("./System");

const ArgDef       = require ("./ArgumentDef");
const OutputParams = require ("./OutputParams");
const FieldGroup   = require ("./FieldGroup");
const SARTGroup    = require ("./SARTGroup");


class CommandDef extends SARTDef
{   

    MinArgsAmount     = 0;
    
    ValidArgs         = new SARTGroup ();
    Subcommands       = {};
    
    OutputObjectClass = null;
    DefaultListMode   = CONSTANTS.LISTMODE_SEPARATE;    
    
    MatchFunc         = null; // Should be a function (param_str).
    ExecFunc          = null;
    OutFunc           = null;
    AsActiveCommand   = true;

    Helplines         = [];
    


    /* Overridable, these implementations do nothing. */
    async OnExecute           (cmd_instance)  { if (this.ExecFunc != null) return await this.ExecFunc (cmd_instance);                      return true; }
    async OnOutput            (cmd_instance)  { if (this.OutFunc  != null) return await this.OutFunc  (cmd_instance); this.DisplayHelp (); return true; }    
          GetCustomSubCommand (next_arg_peek) { return null; }
     

    constructor (command_name)
    {
        super (command_name);
    }   
    

    WithArgs              (...argdefs)  { this.ValidArgs.AddAll (...argdefs); }        
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
    GetValidArgs          ()            { return this.ValidArgs;  }
    GetOutputObjectClass  ()            { return this.OutputObjectClass; }
    HasOutputObjectClass  ()            { return this.OutputObjectClass != null; }
    RunAsActiveCommand    ()            { return this.AsActiveCommand == true; }
    toString              ()            { return this.GetName (); }
    
    GetEffectiveListMode  (cmd)         { return cmd.HasListMode ()     ? cmd.GetListMode     () : this.DefaultListMode; }
    GetEffectiveFields    (cmd)         { return cmd.HasWantedFields () ? cmd.GetWantedFields () : this.GetDefaultFields (this.GetEffectiveListMode (cmd) ); }
  
    GetDefaultFields      (listmode)    { return this.HasOutputObjectClass () ? this.GetOutputObjectClass ().GET_DEFAULT_FIELDNAMES (listmode) : [FieldGroup.All.Name]; }
    GetAvailableFetches   ()            { return this.HasOutputObjectClass () != null && this.GetOutputObjectClass ().GET_ALL_AVAILABLE_FETCHES != null ? 
                                                 this.GetOutputObjectClass ().GET_ALL_AVAILABLE_FETCHES () : null; }
    GetAvailableFetchesStr()            { return this.GetAvailableFetches ()?.GetNamesAsStr (); }


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
            const objclass = this.GetOutputObjectClass ();    
            
            const fieldnames = objclass.GET_ALL_FIELDNAMES_STR ();
            const fetchnames = objclass.GET_ALL_AVAILABLE_FETCHES_STR ();

            if (fieldnames != null)
            {
                Sys.INFO ("");
                Sys.INFO ("Fields: " + fieldnames);
            }

            if (fetchnames != null)
            {
                Sys.INFO ("");
                Sys.INFO ("Available fetches: " + fetchnames);
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
        return true;
    }

}


const ARGDEF_FIELDS = new ArgDef ("fields")
                        .WithHasParam ()
                        .WithAlias ("f")                        





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

class FieldCMD extends CommandDef
{

    constructor ()
    {
        super ();
        this.WithArgs (ARGDEF_FIELDS);
    }


    OnOutput (cmd)
    {   
        const output_obj = cmd.GetOutputObject ();

        if (output_obj != null)
        {
            const outputparams = cmd.HasOutputParams () ? cmd.GetOutputParams () : new OutputParams ();
            
            outputparams.WithCMD      (cmd                           );
            outputparams.WithFields   (this.GetEffectiveFields (cmd) );
            outputparams.WithListMode (cmd .GetListMode        ()    );

            output_obj.Output (outputparams);
        }
        else
            cmd.OnError ("No data to output.");
        
    }

}

class OutputCMD extends CommandDef
{

    Function;

    constructor (name, output_func)
    {
        super (name);

        this.Function = output_func;

        if (output_func == null)
            this.OnProgramError ("a function was not given to the constructor", this);
    }

    OnExecute (cmd)
    {
        return true;
    }

    OnOutput (cmd)
    {  
        if (this.Function != null)
            Sys.OUT_TXT (this.Function () );
                
    }  
}


module.exports = { CommandDef, MessageCMD, SettingCMD, FieldCMD, OutputCMD };

