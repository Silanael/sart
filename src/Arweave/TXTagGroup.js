//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// TXTagGroup.js - 2021-11-29_01
// A group of transaction tags.
//

const SARTGroup    = require ("../SARTGroup");
const State        = require ("../ProgramState");
const Sys          = require ("../System");
const Constants    = require ("../CONSTANTS");
const { SETTINGS } = require ("../SETTINGS");
const Config       = require ("../Config");
const Util         = require ("../Util");
const TXTag        = require ("./TXTag");


class TXTagGroup extends SARTGroup
{
    NameValuePairs = {};
    Duplicates     = false;
    TotalBytes     = null;


    GetList          () { return this.List;           }
    GetNameValueObj  () { return this.NameValuePairs; }
    HasDuplicates    () { return this.Duplicates || this.AsArray ()?.length != Object.keys (this.ByName)?.length; }
    GetTotalBytes    () { if (this.TotalBytes == null) this.Validate (); return this.TotalBytes; }
    toString         () { return "TXTagGroup" + (this.Name != null ? " '" + this.Name + "'" : "");        }

    Validate ()
    {
        if (this.HasDuplicates () )
        {
            this.OnError ("TXTagGroup has duplicate tag names.", this);
            return false;
        }

        let total_bytes = 0;
        for (const t of this.AsArray () )
        {
            total_bytes += t.GetSizeBytes ();            
        }
        this.TotalBytes = total_bytes;
        
        const txmaxbytes = State.GetSetting (SETTINGS.TXTagsMaxTotalBytes);

        if (txmaxbytes == null)
            Sys.WARN_ONCE ("Config.TXTagsMaxTotalBytes is not set. Hope you know what you're doing.");

        else if (total_bytes > txmaxbytes)
            return Sys.ERR ("Total size of TX-tags (" + total_bytes + " bytes) exceeds the set maximum of " + txmaxbytes + ".",
                             "TXTagGroup.Validate", { error_id: Constants.ERROR_IDS.TAG_TOTAL_MAX_SIZE_EXCEED } );

        return true;
    }




    ToGQL ()
    {
        if (this.List == null || this.List.length <= 0)
            return "";

        let str = "tags:[";
        let comma = false;
        for (const t of this.List)
        {
            str += (comma ? "," : "") + t.ToGQL ();
            comma = true;
        }
        str += "]";

        return str;
    }

    AddArweaveTXTags (arweave_tx_tags) 
    {
        if (arweave_tx_tags == null || arweave_tx_tags.length <= 0) 
            return this.OnProgramError ("'arweave_tx_tags' is null or has no entries.", "TXTagGroup.AddArweaveTXTags");        

        for (const t of arweave_tx_tags) 
        {
            if (t.name != null && t.values != null)
                this.Add (new TXTag (t.name, t.values) );
                
            else
                Sys.ERR_ONCE ("Tag not in corrent format - need to be { name:'foo', values:['bar','baz'] } - " + Util.ObjToStr (t), "TXTag.ADD_NATIVE_TAGS");
        }
    }


    AddArFSTagsIfEnabled ()
    {        
        if (Config.GetSetting (SETTINGS.ArFSQueryTagsEnabled) == true)
        {
            const tags = Config.GetSetting (SETTINGS.ArFSQueryTags);

            if (tags == null || tags.length <= 0)
                Sys.ERR_ONCE ("Setting 'ArFSQueryTagsEnabled' is set to true, but 'ArFSQueryTags' is not set. "
                             + "This should be an array of native Arweave-tags.");

            else
                this.AddArweaveTXTags (tags);
        }
    } 


    GetTag      (tag)                          { return this.GetByName      (tag);                   }
    GetTagRegex (regex, case_sensitive = true) { return this.GetByNameRegex (regex, case_sensitive); }
    HasTag      (tag)                          { return this.GetTag (tag) != null;                   }
    
    HasTagRegex (tag_regex, value_regex = null, case_sensitive = true)
    {
        const tag_obj = this.GetTagRegex (tag_regex, case_sensitive);
        return tag_obj != null && (value_regex == null || tag_obj.HasValueRegex (value_regex, case_sensitive) );
    }


    static FROM_QGL_EDGE (edge) 
    {   
        const src = edge?.node?.tags;

        if (src == null)
        {
            this.OnError ("Given GQL-edge null or contains no tags.", "TXTagGroup.FROM_GQL_EDGE");
            return null;
        }

        const tags = new TXTagGroup ();

        for (const t of src) 
        {
            tags.Add (new TXTag (t.name, t.value), {add_duplicates: true} );
        }

        tags.Validate ();

        return tags;
    }



    static FROM_ARWEAVETX (arweave_tx) 
    {

        if (arweave_tx == null)
        {
            this.OnProgramError ("Given arweave_tx null or contains no tags.", "TXTagGroup.FROM_ARWEAVETX");
            return null;
        }

        const txid = arweave_tx.id;
        const len  = arweave_tx.tags != null ? arweave_tx.tags.length : 0;

        if (len <= 0)
            this.OnWarning ("No tags obtained from transaction " + txid + " !", "TXTagGroup.FROM_ARWEAVETX");


        else 
        {
            const tags = new TXTagGroup ();

            let tag;

            for (let C = 0; C < len; ++C)
            {
                tag = arweave_tx.tags[C];
                tags.Add (new TXTag
                (
                    tag.get ('name',  { decode: true, string: true } ),
                    tag.get ('value', { decode: true, string: true } )
                ));                
            }

            tags.Validate ();

            return tags;
        }

        return null;
    }

}



module.exports = TXTagGroup;