//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTBase.js - 2021-12-18_01
//
// SART base class that only comes with
// identification-functionality.
//

const Util = require ("./Util");
const Sys  = require ("./System");


class SARTBase
{
    Name               = null;
    Aliases            = []; 
    ObjectType         = null;

    Main               = null;
    NameCaseSensitive  = false;

    Errors             = null;
    Warnings           = null;


    constructor ({ name = null } = {} )
    {
        this.Name = name;
    }


    WithName           (name)                                  { this.Name       = name;                                        return this; }
    WithAlias          (alias)                                 { this.Aliases    = this.Aliases.push   (alias);                 return this; }
    WithAliases        (...aliases)                            { this.Aliases    = this.Aliases.concat (aliases);               return this; }
    WithObjType        (objtype)                               { this.ObjectType = objtype;                                                  }
    WithMain           (main)                                  { this.Main       = main;                                        return this; }    
    GetID              ()                                      { return this.GetName ();                                                     }
    GetName            ()                                      { return this.Name;                                                           }
    GetMain            ()                                      { return this.Main;                                                           }    
    toString           ()                                      { return this.Name != null ? this.Name : "SARTBase"; }
    WithCaseSensitive  ()                                      { this.NameCaseSensitive = true;  return this; }

    OnWarning          (warning, src, opts)                    { return this.__OnError ("Warnings", Sys.WARN,             warning, src, opts)                 }  
    OnError            (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,              error,   src, opts)                 }  
    OnOverridableError (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR_OVERRIDABLE,  error,   src, opts)                 }  
    OnErrorOnce        (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,              error,   src, opts)                 }  
    OnProgramError     (error,   src, opts = { once: false })  { return this.__OnError ("Errors",   Sys.ERR,              error,   src, opts)                 }
    HasWarnings        ()                                      { return this.Warnings?.length > 0;                                                            }
    HasErrors          ()                                      { return this.Errors  ?.length > 0;                                                            }       

    HasName (name)
    { 
        if (this.Name == null || name == null)
            return false;
        
        if (Util.StrCmp (name, this.Name, !this.NameCaseSensitive) )
            return true;

        for (const a of this.Aliases)
        {
            if (Util.StrCmp (name, a, !this.NameCaseSensitive) )
                return true;
        }
        
        return false;
    }        


    MatchesNameRegex (name_regex, case_sensitive = true)
    {
        if (name_regex == null)
            return false;


        if (Util.StrCmp_Regex (name_regex, this.Name, !case_sensitive) )
            return true;

        for (const a of this.Aliases)
        {
            if (Util.StrCmp_Regex (name_regex, a, !this.NameCaseSensitive) )
                return true;
        }            

        return false;
    }

    __OnError (field, errfunc, error, src, opts)
    {
        if (!errfunc (error, src, opts) )
        {
            this[field] = Util.AppendToArray (this[field], error, " "); 
            return false;
        }
        else
            return true;        
    }    

}


module.exports = SARTBase;