// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// DefaultFields.js - 2022-05-21_01
//
// Holds default fields for the use of SARTObjectDef and CommandDef
// along with convenience-functions.
//
// A setting-key has priority over locally defined defaults,
// names for listmodes will override the generic names.
//
// The getters returning null or an empty array indicates defaults are not set
// and should be treated as "display all fields".
//

const Util = require ("./Util");
const Sys  = require ("./System");

const SEP = ',';


class DefaultFields
{
    FieldNamesArray            = [];
    ListmodesToFieldNamesArray = {}
    DefaultSettingKey          = null;
    ListmodesToSettingKeys     = {};


    WithFieldNamesArray (namearray = [], listmode = null)
    { 
        if (listmode != null)
            this.ListmodesToFieldNamesArray[listmode] = namearray;
        else
            this.FieldNamesArray = namearray;        

        return this;
    }


    WithFieldNamesStr (namestr, listmode = null, separator = SEP)
    { 
        if (namestr != null)
            this.WithFieldNamesArray (namestr.split (separator), listmode);

        return this;            
    }

    WithSettingKey (setting_key, listmode = null)
    {
        if (listmode != null)
            this.ListmodesToSettingKeys[listmode] = setting_key;
        else
            this.DefaultSettingKey = setting_key;

        return this;
    }


    /** Returns an empty array if no defaults could be found. */
    GetFieldNamesArray  (listmode = null)
    { 
        let config_val;

        if (listmode != null)
        {
            // Use dedicated listmode config setting if available
            const lmkey = this.ListmodesToSettingKeys[listmode];            

            if (lmkey != null && (config_val = Sys.GetMain ()?.GetSettingValue (lmkey) ) != null)
                return config_val;

            
            // Use dedicated listmode-namearray if present
            const lmarr = this.ListmodesToFieldNamesArray[listmode];
            if (lmarr != null)
                return lmarr;
        }

        if (this.DefaultSettingKey != null && (config_val = Sys.GetMain ()?.GetSettingValue (this.DefaultSettingKey) ) )
            return config_val;

        else            
            return this.FieldNamesArray;
    }

    /** Returns null if no defaults could be found. */
    GetFieldNameStr (listmode = null)
    { 
        const arr = this.GetFieldNamesArray (listmode);
        return arr?.length > 0 ? arr.join () : null;
    }
}


module.exports = DefaultFields;