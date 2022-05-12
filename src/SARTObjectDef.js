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
const FieldData  = require ("./FieldData").FieldData;
const FieldGroup = require ("./FieldGroup");
const Util       = require ("./Util");
const Sys        = require ("./System");

const FIELDGROUPS_DEFAULT = [FieldGroup.Default, FieldGroup.All, FieldGroup.NotNull, FieldGroup.Null, 
                             FieldGroup.None, FieldGroup.Separate, FieldGroup.Table];


class SARTObjectDef extends SARTBase
{    
    Fields                    = new SARTGroup ({ name: "Field-definitions" });    
    FieldGroups               = new SARTGroup ({ name: "Fieldgroups", entries: FIELDGROUPS_DEFAULT });    
    DefaultFields             = {}; // ListMode-FieldDef map    
    SettingKeys               = {}; // ListMode-Setting  map
    
    Fetches                   = new SARTGroup ({ name: "Fetch-definitions" });
    

    WithFields              (...field_defs)                       { this.Fields      .AddAll (...field_defs);                              return this; }
    WithFieldGroups         (...fieldgroups)                      { this.FieldsGroups.AddAll (...fieldgroups);                             return this; }
    WithFetches             (...fetches)                          { this.Fetches     .AddAll (...fetches);                                 return this; }
    WithDefaultFields       (...field_defs)                       { this.SetDefaultFields (CONSTANTS.LISTMODE_ANY,        ...field_defs);  return this; }
    WithDefaultFields_SEP   (...field_defs)                       { this.SetDefaultFields (CONSTANTS.LISTMODE_SEPARATE,   ...field_defs);  return this; }
    WithDefaultFields_TBL   (...field_defs)                       { this.SetDefaultFields (CONSTANTS.LISTMODE_TABLE,      ...field_defs);  return this; }
    WithSettingKey          (setting_key)                         { this.SetDefaultSettingKey (CONSTANTS.LISTMODE_ANY,      setting_key);  return this; }
    WithSettingKey_SEP      (setting_key)                         { this.SetDefaultSettingKey (CONSTANTS.LISTMODE_SEPARATE, setting_key);  return this; }
    WithSettingKey_TBL      (setting_key)                         { this.SetDefaultSettingKey (CONSTANTS.LISTMODE_TABLE,    setting_key);  return this; }

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
    GetEffectiveFieldDefs ( {fieldnames = null, listmode = CONSTANTS.LISTMODE_DEFAULT} )
    {
        debugger;
        console.log (this.GetSettingFieldDefs ({ listmode: listmode }));
        
        return Util.Or3 (this.GetSettingFieldDefs ({ listmode: listmode }), 
                         this.GetDefaultFieldDefs ({ listmode: listmode }),
                         this.GetAllFieldDefs () );        
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

    SetDefaultFields (listmode = CONSTANTS.LISTMODE_ANY, fields = [])
    {
        if (this.DefaultFields[listmode] == null)
            this.DefaultFields[listmode] = [];
            
        for (const f of fields)        
        {
            if (Util.IsString (f) )
            {
                const def = this.Fields.GetByName (f);

                if (def != null)
                    this.DefaultFields[listmode].push (def);
                else
                    this.OnProgramError ("Could not find field named '" + f + "' - Was WithFields called before this?");
            }
            else
                this.DefaultFields[listmode].push (f);
        }
    }

    SetDefaultSettingKey (listmode = CONSTANTS.LISTMODE_ANY, settingkey)
    {
        this.SettingKeys[listmode] = settingkey;        
    }

}


module.exports = SARTObjectDef;