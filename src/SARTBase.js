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


class SARTBase
{
    Name               = null;
    Aliases            = []; 
    ObjectType         = null;

    Main               = null;
    NameCaseSensitive  = false;
    

    constructor (name = null)
    {
        this.Name = name;
    }


    WithName           (name)                                  { this.Name       = name;                                        return this; }
    WithAliases        (...aliases)                            { this.Aliases    = this.Aliases.concat (aliases);               return this; }
    WithObjType        (objtype)                               { this.ObjectType = objtype;                                                  }
    WithMain           (main)                                  { this.Main       = main;                                        return this; }    
    GetID              ()                                      { return this.GetName ();                                                     }
    GetName            ()                                      { return this.Name;                                                           }
    GetMain            ()                                      { return this.Main;                                                           }    
    toString           ()                                      { return this.Name != null ? this.Name : "SARTBase"; }
    WithCaseSensitive  ()                                      { this.NameCaseSensitive = true;  return this; }


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


}


module.exports = SARTBase;