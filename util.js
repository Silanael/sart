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


    HasNext () { return this._Argv != null && this._Pos < this._Argv.length; }
    PopLC () { return this.Pop ()?.toLowerCase (); }
    PopUC () { return this.Pop ()?.toUpperCase (); }


    RequireAmount (amount)
    { 
        // This should exit.
        if (this._Argv.length - this._Pos < amount)         
            Sys.ERR_MISSING_ARG ();
            
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




function GetDate (date_time_spacer_chr = ' ')
{ 
    const now = new Date (); 

    const y   = now.getFullYear ();
    const m   = String (now.getMonth   () + 1 ) .padStart (2, '0');
    const d   = String (now.getDate    ()     ) .padStart (2, '0');
    const h   = String (now.getHours   ()     ) .padStart (2, '0');
    const min = String (now.getMinutes ()     ) .padStart (2, '0');
    const s   = String (now.getSeconds ()     ) .padStart (2, '0');

    return y + "-" + m + "-" + d + date_time_spacer_chr + h + ":" + min + ":" + s;
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




function DecodeTXTags (tx)
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
        const decoded_tags =
        { 
            entries: {},
            toString () 
            { 
                return Object.entries (this.entries)?.length + " -> " + ObjToStr (this.entries); 
            } 
        };
                 
        let tag;
        for (let C = 0; C < len; ++C)
        {
            tag = tx.tags[C];
            decoded_tags.entries [tag.get ('name',  { decode: true, string: true }) ]
                                = tag.get ('value', { decode: true, string: true });
        }
        return decoded_tags;
    }    
}



module.exports = { Args,
                   IsFlag, IsFlagWithArg, GetCmdArgs, RequireArgs, RequireParam, IsArweaveHash, IsArFSID, 
                   GetDate, GetUNIXTime, GetVersion, GetVersionStr, PopArg,
                   StrCmp, StrCmp_Regex, StrCmp_Wildcard, DecodeTXTags };