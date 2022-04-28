// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// FieldDefs.js - 2022-04-26_01
//
// Field definitions to be used to output object data
//

const FieldGroup = require ("./FieldGroup");
const FieldData  = require ("./FieldData");

const FIELDGROUPS_DEFAULT = [FieldGroup.Default, FieldGroup.All, FieldGroup.NotNull, FieldGroup.Null, 
                             FieldGroup.None, FieldGroup.Separate, FieldGroup.Table];


class FieldDefs 
{
    AllFields    = new SARTGroup ();
    FieldGroups  = new SARTGroup ().With (...FIELDGROUPS_DEFAULT);
    
    DefaultFields = {};
    SettingKeys   = {};  
    

    CreateFieldDataEntries (sobj, dest_sartgroup)
    {
        for (const fdef of this.Allfields?.AsArray () )
        {
            dest_sartgroup?.Add (new FieldData (sobj, fdef) );
        }
    }





    static GET_FIELD_DEF   (field_name, case_sensitive = false) { return this.GET_ALL_FIELD_DEFS   ()?.GetByName (field_name, case_sensitive); }
    static GET_FIELD_GROUP (field_name, case_sensitive = false) { return this.GET_ALL_FIELD_GROUPS ()?.GetByName (field_name, case_sensitive); }


    
    static GET_ALL_FIELD_DEFS           ()         { return this.FIELDS; }
    static GET_ALL_FIELD_GROUPS         ()         { return this.FIELDGROUPS; }
    static GET_ALL_FIELDNAMES           ()         { return this.FIELDS?.GetNamesAsArray (); }
    static GET_ALL_FIELDNAMES_STR       ()         { return this.FIELDS?.GetNamesAsStr   (); }
    static GET_SETTING_FIELDNAMES       (listmode) { return this.FIELDS_SETTINGKEYS[listmode] != null ? Sys.GetMain().GetSetting (this.FIELDS_SETTINGKEYS[listmode]) : null; }    
    static GET_DEFAULT_FIELDNAMES       (listmode) { return this.FIELDS_DEFAULTS[listmode]; }
    
    static GET_EFFECTIVE_FIELDNAMES     (listmode)
    { 
        const s = this.GET_SETTING_FIELDNAMES (listmode);
        if (s != null)
            return s;
        else
        {
            const d = this.GET_DEFAULT_FIELDNAMES (listmode);
            return d != null ? d : this.GET_ALL_FIELDNAMES ();
        }
    }
}


module.exports = FieldDefs;