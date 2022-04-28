// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTObjectDefs.js - 2022-04-26_01
//
// Static per-class data of SARTObjects, such as field and fetch definitions.
//

const CONSTANTS  = require ("./CONSTANTS");
const SARTGroup  = require ("./SARTGroup");
const FieldData  = require ("./FieldData");
const FieldGroup = require ("./FieldGroup");
const Util       = require ("./Util");

const FIELDGROUPS_DEFAULT = [FieldGroup.Default, FieldGroup.All, FieldGroup.NotNull, FieldGroup.Null, 
                             FieldGroup.None, FieldGroup.Separate, FieldGroup.Table];

class SARTObjectDef
{
    TypeName                  = "SARTObject";

    Fields                    = new SARTGroup ({ name: "Field definitions" });    
    FieldGroups               = new SARTGroup ({ name: "Field groups", entries: FIELDGROUPS_DEFAULT });    
    DefaultFields             = {}; // ListMode-FieldDef map
    SettingKeys               = {}; // ListMode-Setting  map
    
    Fetches                   = new SARTGroup ({ name: "Fetch definitions" });


    GetTypeName         ()                                        { return this.TypeName;                                             }

    GetAllFieldDefs     ()                                        { return this.Fields;                                               }
    GetAllFieldNames    ()                                        { return this.Fields?.GetNamesAsArray ();                           }
    GetAllFieldNamesStr ()                                        { return this.Fields?.GetNamesAsStr   ();                           }
    GetFieldDef         ( field_name, 
                         {case_sensitive = false} = {} )          { return this.Fields?.GetByName (field_name, case_sensitive);       }
    GetDefaultFieldDefs ({listmode = CONSTANTS.LISTMODE_DEFAULT}) { return this.DefaultFields[listmode];                              }
    GetSettingFieldDefs ({listmode = CONSTANTS.LISTMODE_DEFAULT}) { const k = this.SettingKeys[listmode]; 
                                                                    return k != null ? Sys.GetMain().GetSetting (k) : null;           }             

    GetAllFetchNamesStr ()                                        { return this.Fetches?.GetNamesAsStr   ();                          }
    GetAllFetchDefs     ()                                        { return this.Fetches;                                              }
    GetAllFetchNames    ()                                        { return this.Fetches?.GetNamesAsArray ();                          }
    GetFetchDef         ( fetch_name, 
                         {case_sensitive = false} = {} )          { return this.Fetches?.GetByName (fetch_name, case_sensitive);      }


    // TODO: Implement fieldnames.
    GetEffectiveFieldDefs ( {fieldnames = null, listmode = CONSTANTS.LISTMODE_DEFAULT} )
    {
        return Util.Or (this.GetSettingFieldDefs ({ listmode: listmode }), this.GetDefaultFieldDefs ({ listmode: listmode }) );        
    }


    CreateFieldDataEntries (sobj)
    {
        const group = new SARTGroup ();
        
        for (const fdef of this.Fields?.AsArray () )
        {
            group.Add (new FieldData (sobj, fdef) );
        }

        return group; 
    }

}


module.exports = SARTObjectDef;