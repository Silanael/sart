// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTObjectDefs.js - 2022-04-26_01
//
// Static per-class data of SARTObjects, such as field and fetch definitions.
//

const CONSTANTS  = require ("./CONSTANTS");
const SARTBase   = require ("./SARTBase");
const SARTGroup  = require ("./SARTGroup");
const FieldGroup = require ("./FieldGroup");
const DFields    = require ("./DefaultFields");
const Util       = require ("./Util");
const Sys        = require ("./System");

const FIELDGROUPS_DEFAULT = [FieldGroup.Default, FieldGroup.All, FieldGroup.NotNull, FieldGroup.Null, 
                             FieldGroup.None, FieldGroup.Separate, FieldGroup.Table];


class SARTObjectDef extends SARTBase
{    
    static CLASS_DFIELDS      = DFields;

    Fields                    = new SARTGroup ({ name: "Field-definitions" });    
    FieldGroups               = new SARTGroup ({ name: "Fieldgroups", entries: FIELDGROUPS_DEFAULT });    
    DefaultFields             = new DFields ();
    
    Fetches                   = new SARTGroup ({ name: "Fetch-definitions" });
    

    WithFields              (...field_defs)                       { this.Fields      .AddAll (...field_defs);                     return this; }
    WithFieldGroups         (...fieldgroups)                      { this.FieldsGroups.AddAll (...fieldgroups);                    return this; }
    WithFetches             (...fetches)                          { this.Fetches     .AddAll (...fetches);                        return this; }
    WithDefaultFields       (dfields = 
                             new SARTObjectDef.CLASS_DFIELDS () ) { this.DefaultFields = dfields;  return this; }
    

    WithDefaultFieldNamesArray     (namearray, listmode = null)   { this.DefaultFields.WithFieldNamesArray (namearray, listmode); return this; }
    WithDefaultFieldNamesStr       (namestr,   listmode = null)   { this.DefaultFields.WithFieldNamesStr   (namestr,   listmode); return this; }
    WithDefaultFieldSettingKey     (key,       listmode = null)   { this.DefaultFields.WithSettingKey      (key,   listmode); return this;     }
    WithDefaultFieldSettingKey_Tbl (key)                          { return this.WithDefaultFieldSettingKey (key, CONSTANTS.LISTMODE_TABLE);    }
                                                                  

    GetTypeName         ()                                        { return this.GetName ();                                           }

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
    GetEffectiveFieldDefGroup ( {fieldnames = [], listmode = CONSTANTS.LISTMODE_DEFAULT} = {} )
    {        
        const defgroup =  Util.Or3 (this.GetSettingFieldDefs ({ listmode: listmode }), 
                                    this.GetDefaultFieldDefs ({ listmode: listmode }),
                                    this.GetAllFieldDefs () );
                            
        return fieldnames?.length > 0 ? defgroup?.GetEffectiveItems (fieldnames, {groupdefgrp: this.FieldGroups}) : defgroup; 
            
    }


}


module.exports = SARTObjectDef;