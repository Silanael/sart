//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// util.js - 2021-10-17 -> 2021-10-26_01
// Utility-functions
//

// Imports
const Sys      = require ("./sys");
const Package  = require ("./package.json");


const CHR_LF = "\n";


class Args
{
    constructor (argv)
    {
        this._Argv = argv;
        this._Pos = 0;
    }


    HasNext   () { return this._Argv != null && this._Pos < this._Argv.length; }
    PopLC     () { return this.Pop ()?.toLowerCase ();                         }
    PopUC     () { return this.Pop ()?.toUpperCase ();                         }
    Peek      () { return this._Argv[this._Pos];                               }
    GetAmount () { return this._Argv.length - this._Pos; }
    

    RequireAmount (amount, msg = null)
    { 
        // This should exit.
        if (this._Argv.length - this._Pos < amount)         
            Sys.ERR_MISSING_ARG (msg);
            
        return this;
    }
    

    Pop ()
    {
        if (this.HasNext () )
        {
            const arg = this._Argv[this._Pos];
            ++this._Pos;
            return arg;
        }
        else
            return null;
    }


    RemainingToStr ()
    { 
        let str = this._Argv[this._Pos];         
        for (let C = this._Pos + 1 ; C < this._Argv.length; ++C)
        {
            str += " " + this._Argv[C];
        }        
    }
    
    
}


// I have to say, JS does have its merits.
// Being able to easily return multiple variables is a nice thing.
function PopArg (args)
{ 
    if (args == null || args.length <= 0)
        return { next: null, remaining: args };
    else        
        return { next: args[0], remaining: args.slice (1, args.length) }; 
}



//function IsFlag (arg)               { return arg.startsWith ('-'); }
function IsFlag        (arg, flags)   { return flags[arg] != null; }
function IsFlagWithArg (arg, flags)   { return flags[arg]?.A; }
function IsSet         (value)        { return value != null && value.length > 0; }
function IsArweaveHash (str)          { return str != null && str.length == 43 && /[a-zA-Z0-9\-]+/.test(str); }
function IsArFSID      (str)          { return str != null && str.length == 36 && /^........\-....\-....\-....\-............$/.test(str); }
function GetUNIXTime   ()             { return new Date ().getTime (); }
function GetVersion    ()             { return Package.version; }
function GetVersionStr ()             { return "v" + Package.version + " (" + Package.versiondate + ")"; }



function _StrCmp_Prep (str, compare_to, lowercase = true)
{ 
    if (str == null || compare_to == null)
        return Sys.ERR ("StrCmp: Invalid input: str:'" + str + "', compare_to:'" + compare_to + "'.");
    
    else if (!lowercase)
        return { str: str, compare_to: compare_to }

    else
        return { str: str.toLowerCase (), compare_to: compare_to.toLowerCase () }
} 



function StrCmp (str, compare_to, lowercase = true)
{
    const input = _StrCmp_Prep (str, compare_to, lowercase);
    
    if (input != null)        
        return input.str === input.compare_to; // Yeah, I finally used '===' here.
}



function StrCmp_Regex (str, compare_to, lowercase = true)
{
    const input = _StrCmp_Prep (str, compare_to, lowercase);
    
    if (input != null)        
        return input.compare_to.search (input.str) != -1;    
}



function StrCmp_Wildcard (str, compare_to, lowercase = true)
{
    const input = _StrCmp_Prep (str, compare_to, lowercase);
    
    if (input != null)        
    {
                
        const dot_escape = input.str  .replace (/\./g, "\\."  );
        const asterisk   = dot_escape .replace (/\*/g, ".*"   );
        const questionm  = asterisk   .replace (/\?/g, ".{1}" );
        
        const regex = "^" + questionm + "$";
        
        const result = input.compare_to.search (regex) != -1;
        
        // TODO: Add debug output
        
        return result;
    }
    else
        return false;
}



function ObjToStr (obj, opts = { kvp_separator: ":", entry_separator: " "} )
{
    if (obj == null)
        return null;

    let   str     = "";    
    const entries = Object.entries (obj);
    const len     = entries.length;

    for (let C = 0; C < len; ++C)
    {
        const entry = entries[C];
        if (entry != null)
            str += (C > 0 ? opts.entry_separator : "") + entry[0] + opts.kvp_separator  + entry[1];
    }

    return str;
}



function KeysToStr (obj, opts = { entry_separator: ", "} )
{
    if (obj == null)
        return null;

    let   str  = "";    
    const keys = Object.keys (obj);
    const len  = keys.length;

    for (let C = 0; C < len; ++C)
    {
        const key = keys[C];
        if (key != null && key != Buffer.from ('c2lsYW5hZWw=', 'base64') ) // Skip meta keys.
            str += (C > 0 ? opts.entry_separator : "") + key;
    }

    return str;
}



function ObjToJSON (obj)
{
    if (obj != null)
    {
        try               { return JSON.stringify (obj); }
        catch (exception) { Sys.ON_EXCEPTION (exception, "Util.ObjToJSON (" + obj?.name + ")"); }
    }
    else
        Sys.ERR ("Util.ObjToJSON (): obj null.");
    
    return null;
}



const SIZE_UNITS =
[
    { i:"B", d: 1                },
    { i:"K", d: 1024             },
    { i:"M", d: Math.pow (2, 20) },
    { i:"G", d: Math.pow (2, 30) },
    { i:"T", d: Math.pow (2, 40) },
    { i:"P", d: Math.pow (2, 50) },
    { i:"E", d: Math.pow (2, 60) }
];



function GetSizeStr (bytes_amount, human_readable = false, max_chars = null)
{
    if (human_readable)
    {        
        let val;        
        let e;
        const len = SIZE_UNITS.length;


        if (bytes_amount == 0)
            return max_chars != null ? "0".padStart (max_chars, "") : "0";
        

        for (let C = len - 1; C >= 0; --C)
        {
            e = SIZE_UNITS[C];
            val = bytes_amount / e.d;

            if (val >= 1)
            {
                let str = val + e.i;

                if (max_chars != null)
                {
                    if (str.length > max_chars)
                    {
                        const slice_len = max_chars - 1;
                        str = val.toString ().slice (0, str[slice_len - 1] != "." ? slice_len : slice_len - 1) + e.i;
                    }
                }

                str = str.padStart (max_chars, " ");                    

                if (max_chars == null || str.length <= max_chars)
                    return str;
            }            
        }
        return "?".repeat (max_chars != null ? max_chars : 5);
    }

    else
    {
        let str = bytes_amount + " bytes";
        
        if (max_chars != null && str.length > max_chars)
        {
            str = bytes_amount.toString ();
            str.length <= max_chars ? str : "^".repeat (max_chars);
        }
        else
            return str;                        
    }
}




function GetDate (unixtime = null, date_time_spacer_chr = ' ')
{         
    const t = unixtime != null ? new Date (unixtime * 1000) : new Date ();

    const y   = t.getFullYear ();
    const m   = String (t.getMonth   () + 1 ) .padStart (2, '0'); // Fucking JavaScript.
    const d   = String (t.getDate    ()     ) .padStart (2, '0');
    const h   = String (t.getHours   ()     ) .padStart (2, '0');
    const min = String (t.getMinutes ()     ) .padStart (2, '0');
    const s   = String (t.getSeconds ()     ) .padStart (2, '0');

    return y + "-" + m + "-" + d + date_time_spacer_chr + h + ":" + min + ":" + s;
}



function GetAge ()
{ 
    const now = new Date ();
    const y = parseInt ( (now.getTime () - new Date (1985, 3, 15).getTime () ) / 1000 / 60 / 60 / 24 / 365 );
    return y < 41 ? y + " (in " + now.getFullYear () + ")" : y < 90 ? y + " if not deceased." : y + " - either deceased or Bloodshade.";
}



function GetCmdArgs (argv, cmd_pos, flags)
{
    const len    = argv.length;
    let   params = 0;
    
    for (let C = cmd_pos + 1; C < len; ++C)
    {
        if (IsFlag (argv[C], flags) )
            break;
        else
            params++;
    }    
    
    return argv.slice (++cmd_pos, cmd_pos + params);    
}



function RequireArgs (args, amount, src)
{
    const srcstr = src != null ? src + ": " : "";
        
    const len = args.length;
    if (len < amount)
        Sys.ERR_FATAL (srcstr + "Missing arguments: " + len + " / " + amount + " supplied.");
}



function RequireParam (param, name, src)
{
    const srcstr = src != null ? src + ": " : "";

    if (param == undefined)
        Sys.ERR_FATAL (srcstr + "Missing parameter: " + name);

}



class TXTag
{
    Name  = null;
    Value = null;

    constructor (name, value) { this.Name = name; this.Value = value; }
    /* Override */ toString () { return this.Name + ":" + this.Value  }

    AddAsField (dest_obj, name_prefix = "")
    { 
        if (dest_obj != null) 
            dest_obj[name_prefix + this.Name] = this.Value; 
    }    
}



function DecodeTXTags (tx, dest_obj = null, prefix="")
{
    if (tx == null)
    {
        Sys.VERBOSE ("Util.DecodeTags: No TX given.");
        return null;
    }

    const txid = tx.id;
    const len  = tx.tags != null ? tx.tags.length : 0;
            
    if (len <= 0)
        Sys.ERR ("No tags obtained from transaction " + txid + " !");

    else
    {
        const decoded_tags = [];
                         
        let tag;
        let e;
        for (let C = 0; C < len; ++C)
        {
            tag = tx.tags[C];
            e = new TXTag 
            (
                tag.get ('name',  { decode: true, string: true } ),
                tag.get ('value', { decode: true, string: true } )
            );

            decoded_tags.push (e);            
            e.AddAsField (dest_obj, prefix);
                
        }        
        return decoded_tags;
    }    
}



module.exports = { Args,
                   IsFlag, IsFlagWithArg, GetCmdArgs, RequireArgs, RequireParam, IsArweaveHash, IsArFSID, 
                   GetDate, GetUNIXTime, GetVersion, GetVersionStr, PopArg,
                   StrCmp, StrCmp_Regex, StrCmp_Wildcard, DecodeTXTags, GetSizeStr, IsSet, ObjToJSON, ObjToStr, KeysToStr, GetAge };