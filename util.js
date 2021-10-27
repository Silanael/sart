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
function IsFlag        (arg, flags)   { return flags[arg] != undefined; }
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
    {
        const match = input.compare_to.match (input.str);
        return match != null && match != "";
    }        
}




function StrCmp_Wildcard (str, compare_to, lowercase = true)
{
    const input = _StrCmp_Prep (str, compare_to, lowercase);
    
    if (input != null)        
    {
        const tgt    = input.compare_to;
        const tgtlen = input.compare_to.length;
        const str    = input.str;

        // Handle '*'
        const s        = str.split ("*");       
        const segments = s.length;

        Sys.INFO (s);

        // A failsafe
        if (segments <= 0)
        {
            Sys.VERBOSE ("StrCmp_Wildcard's split returned 0 segments for some reason - comparison may not be accurate.");
            return str === tgt;
        }
        
        // Input has only one *
        else if (segments == 1 || s[0] == "" || s[1] == "")
            return _StrCmp_Matches_WCard (str, tgt, 0, tgtlen, true);

        else
        {
            let offset = 0;
            for (let part = 0; part < segments; ++part)
            {
                if ( (offset = _StrCmp_Matches_WCard (s[part], tgt, offset, tgtlen, false)) == -1)
                    return false;
            }
            return true;
        }
                        
    }        
}


function _StrCmp_Matches_WCard (str, tgt, tgt_offs, tgt_len, has_to_start_from_tgt_offs)
{
    if (str == null)
        return false;

    else if (has_to_start_from_tgt_offs)
    {
        // Could have done this with a regex, but what the hell.
        const len = str.length;
        let strc;
        for (let C = 0; C < len && tgt_offs < tgt_len; ++C)
        {
            strc = str[C];
            if (strc != "?" && strc != tgt[tgt_offs])
                return -1;
            else
                ++tgt_offs;
        }
    }

    else
    {
        //const regex = tgt.replace (/?)
        //const len = str.length;
        //let strc;
    }

    return tgt_offs;
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


module.exports = { Args,
                   IsFlag, GetCmdArgs, RequireArgs, RequireParam, IsArweaveHash, IsArFSID, 
                   GetDate, GetUNIXTime, GetVersion, GetVersionStr, PopArg,
                   StrCmp, StrCmp_Regex, StrCmp_Wildcard };