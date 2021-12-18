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
    Main               = null;


    constructor (name = null)
    {
        this.Name = name;
    }


    WithName           (name)                                  { this.Name       = name;                                        return this; }
    WithMain           (main)                                  { this.Main       = main;                                        return this; }    
    GetID              ()                                      { return this.GetName ();                                                     }
    GetName            ()                                      { return this.Name;                                                           }
    GetMain            ()                                      { return this.Main;                                                           }
    HasName            (name, case_sensitive = true)           { return this.Name != null && name != null && 
                                                                             Util.StrCmp (name, this.Name, !case_sensitive);                 }        
    toString           ()                                      { return this.Name != null ? this.Name : "SARTBase"; }


    MatchesNameRegex (name_regex, case_sensitive = true)
    {
        if (name_regex == null)
            return false;

        return Util.StrCmp_Regex (name_regex, this.Name, !case_sensitive);
    }


}


module.exports = SARTBase;