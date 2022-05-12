//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// util.js - 2021-10-17 -> 2021-10-26_01
// Utility-functions
//

// Imports
const Path      = require ('path');
const Crypto    = require ("crypto");

const CONSTANTS = require ("./CONSTANTS");
const Package   = require ("../package.json");







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
function IsFlag          (arg, flags)            { return flags[arg] != null; }
function IsFlagWithArg   (arg, flags)            { return flags[arg]?.A; }
function IsString        (value)                 { return value instanceof String || typeof value === "string";}
function IsSet           (value)                 { return value != null && value != "" && value.length > 0; }
function IsArweaveHash   (str)                   { return str != null && str.length == 43 && /[a-zA-Z0-9\-]+/.test(str); }
function IsArFSID        (str)                   { return str != null && str.length == 36 && /^........\-....\-....\-....\-............$/.test(str); }
function IsMIMEType      (str)                   { return str?.split ("/")?.length == 2; }
function GetUNIXTimeMS   ()                      { return new Date ().getTime (); }
function GetVersion      ()                      { return Package.version; }
function GetVersionStr   ()                      { return "v" + Package.version + " [" + Package.versiondate + "]"; }
function IsReleaseVersion ()                     { return Package.isRelease != false; }
function GetDummyDate    ()                      { return "????-??-?? ??:??:??"; }
function StripExtension  (filename)              { return filename != null ? Path.parse (filename)?.name : null; }
function IsTTY           ()                      { return process.stdout.isTTY; }
function IsOutputPiped   ()                      { return !this.IsTTY (); }
function IsFlagSet       (flags, mask)           { return (flags & mask) != 0; }
function Or              (obj1, obj2)            { return obj1 != null ? obj1 : obj2; }
function Or3             (obj1, obj2, obj3)      { return obj1 != null ? obj1 : obj2 != null ? obj2 : obj3; }
function IsSetStrOr      (str1, str2)            { return IsSet (str1) ? str1 : str2; }
function Append          (base, str, sep = " ")  { return base != null ? base + sep + str : str; }
function AppendToArray   (array = [], val)       { if (array == null) array = []; if (val != null) array.push (val); return array; }
function CopyKeysToObj   (src, dest)             { if (src == null || dest == null) return; for (const e of Object.entries (src) ) { dest[e[0]] = e[1]; }  }
async function Delay     (ms)                    { await new Promise (r => setTimeout (r, ms) ); }
function GetAmountStr    (amount, sing, plur)    { return amount == null || amount <= 0 ? "0 " + plur : amount == 1 ? "1 " + sing : amount + " " + plur; }
function GetTopStrLen    (str1, str2)            { const s1len = str1 != null ? str1.length : 0; const s2len = str2 != null ? str2.length : 0; 
                                                   return s1len > s2len ? s1len : s2len; }
function GetRandomUUIDv4 ()                      { return Crypto.randomUUID (); }

function SetPropertyIfValueNotNull (js_obj, propertyname, value)
{
    if (js_obj == null)
        return null;

    if (value != null)
        js_obj[propertyname] = value;

    return js_obj;
}

function SetMissingMembers (js_obj, ...name_value_pairs)
{    
    if (js_obj == null)
        throw "Util.SetMissingMembers: js_obj null";

    if (name_value_pairs?.length % 2 != 0)
        throw "Util.SetMissingMembers: name_value_pairs not supplied or not in pairs of two."; 

    const len = name_value_pairs.length;
    let name, value;

    for (let C = 0; C < len;)
    {
        name  = name_value_pairs [C++];
        value = name_value_pairs [C++];
        if (js_obj[name] == null)
            js_obj[name] = value;
    }
    
}

function AssignIfNotNull (dest, varname, value)
{
    if (value != null && dest != null)
        dest[varname] = value;

    return dest;
}

function AppendIfNotNull (base, str, sep = " ")
{ 
    if (str == null)
        return base;
    else
        return Append (base, str, sep);    
}

function AppendToArrayNoDupes (items = [], array = [])
{    
    for (const i of items)
    {
        if (!array.includes (i) )
            array.push (i);
    }
    
    return array;
}

function RequireOptional (path)
{
    try
    {
        const r = require (path);
        return r;
    }
    catch (exception) {}
    return null;
}


function ContainsString (str, strings, case_insensitive = true, trim = true)
{
    if (trim)
        str = str.trim ();

    if (case_insensitive)
        return strings.find ( (v) => v.toLowerCase () == str.toLowerCase () ) != null;

    else
        return strings.find ( (v) => v == str) != null;
}


function _StrCmp_Prep (str, compare_to, lowercase = true)
{ 
    if (! IsString (str) )        str        = str?.toString ();
    if (! IsString (compare_to) ) compare_to = compare_to?.toString ();
    
    if (!lowercase)
        return { str: str, compare_to: compare_to }

    else
        return { str: str.toLowerCase (), compare_to: compare_to.toLowerCase () }
} 



function StrCmp (str, compare_to, lowercase = true)
{
    const input = _StrCmp_Prep (str, compare_to, lowercase);
    
    if (input != null)        
        return input.str === input.compare_to; // Yeah, I finally used '===' here.

    else
        return false;
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


function ArrayToStr (array, opts = CONSTANTS.UTIL_ARRAYTOSTR_DEFAULTS)
{
    if (array == null)
        return null;
    
    if (opts.entry_separator == null)
        opts.entry_separator = "";

    let str = "";    
    let sep = false;
        
    if (!opts.values_in_quotes)
    {
        for (const i of array)
        {
            str += (sep ? opts.entry_separator : "") + i;
            sep = true;
        }   
    }
    else for (const i of array)
    {
        str += (sep ? opts.entry_separator : "") + "\""  + i + "\"";
        sep = true;
    }

    return str;
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
        {
            str += (C > 0 ? opts.entry_separator : "") + entry[0] + opts.kvp_separator;
            const val_str = entry[1].toString ();

            // Recursive add            
            if (val_str == "object Object" || val_str == "[object Object]")
                str += ObjToStr (entry[1], opts);

            else
                str += val_str;
        }
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
        catch (exception) { return null; }
    }
    
    return null;
}

function JSONToObj (json_str)
{
    if (json_str != null)
    {
        try               { return JSON.parse (json_str); }
        catch (exception) { return null; }
    }
    
    return null;
}


function StrToFlags (str, flagtable, opts = {chr_separator: ",", lcase: false, ucase: true, ret_no_matches: null } )
{
    if (str       == null) return opts.ret_no_matches != null ? opts.ret_no_matches : 0; //{ Sys.ERR ("String null.",    "Util.StrToFlags"); return 0; }
    if (flagtable == null) return opts.ret_no_matches != null ? opts.ret_no_matches : 0; //{ Sys.ERR ("Flagtable null.", "Util.StrToFlags"); return 0; }
    
    if      (opts.lcase) str = str.toLowerCase ();
    else if (opts.ucase) str = str.toUpperCase ();

    const flagstrings = opts.chr_separator != null ? str.split (opts.chr_separator) : [str];

    let flags = 0;
    let matches = false;
    
    for (const s of flagstrings)
    {        
        if (flagtable[s] != null)
        {
            flags |= flagtable[s];
            matches = true;
        }
        //else
            //Sys.ERR ("Unknown flag: " + s, "Util.StrToFlags");
    }

    return matches == true ? flags : opts.ret_no_matches != null ? opts.ret_no_matches : flags;
}


function TXStatusCodeToStr (statuscode)
{
    switch (statuscode)
    {
        case 200: return "OK";
        case 202: return "PENDING";
        case 404: return "FAILED";
        default:  return statuscode;
    }
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

function GetShortArweaveHash (hash)
{
    if (IsArweaveHash (hash) )
        return hash.slice (0, 5) + ".." + hash.slice (-5);    
    else
        return null;
}

function GetShortString (str, max_len = 10, separator = "...")
{
    if (str == null)
        return null;

    if (str.length <= max_len)
        return str;

    if (separator == null)
        separator = "";

    const ends_len = parseInt ( (max_len - separator.length) / 2);

    if (ends_len <= 0)
        return str.slice (0, max_len);

    else
        return str.slice (0, ends_len) + separator + str.slice (-ends_len);
    
}


function GetDate (unixtime = null, date_time_spacer_chr = ' ', utc = false)
{         
    if (date_time_spacer_chr == null)
        date_time_spacer_chr = ' ';

    const t = unixtime != null ? new Date (unixtime * 1000) : new Date ();

    const y   = !utc ? t.getFullYear (): t.getUTCFullYear ();
    const m   = String ( (!utc ? t.getMonth   () : t.getUTCMonth   ()) + 1 ) .padStart (2, '0'); // Fucking JavaScript.
    const d   = String ( (!utc ? t.getDate    () : t.getUTCDate    ())     ) .padStart (2, '0');
    const h   = String ( (!utc ? t.getHours   () : t.getUTCHours   ())     ) .padStart (2, '0');
    const min = String ( (!utc ? t.getMinutes () : t.getUTCMinutes ())     ) .padStart (2, '0');
    const s   = String ( (!utc ? t.getSeconds () : t.getUTCSeconds ())     ) .padStart (2, '0');

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


function GetKeyFromJSObj (js_obj, key, case_sensitive = false)
{
    if (js_obj == null)
        return null;

    else if (case_sensitive)
        return js_obj[key];

    else
    {
        for (const e of Object.entries (js_obj) )
        {                
            if (StrCmp (e[0], key, true) )
                return e[1];
        }
    }
    return null;
}











module.exports = {  
                   IsFlag, IsFlagWithArg, GetCmdArgs, IsArweaveHash, IsArFSID, TXStatusCodeToStr, StripExtension, GetTopStrLen, AppendToArrayNoDupes,
                   GetDate, GetUNIXTimeMS, GetVersion, GetVersionStr, PopArg, IsTTY, IsOutputPiped, StrToFlags, IsFlagSet, Delay, ContainsString,
                   StrCmp, StrCmp_Regex, StrCmp_Wildcard, GetSizeStr, IsSet, ObjToJSON, ObjToStr, KeysToStr, GetAge, GetDummyDate, GetShortArweaveHash,
                   Or, Append, AssignIfNotNull, CopyKeysToObj, AppendIfNotNull, AppendToArray, ArrayToStr, GetAmountStr, AmountStr:GetAmountStr,
                   IsString, RequireOptional, IsSetStrOr, IsReleaseVersion, Or3,
                   GetRandomUUIDv4, JSONToObj, SetMissingMembers, IsMIMEType, GetShortString, GetKeyFromJSObj, SetPropertyIfValueNotNull };