const Util = require('./util.js');
const Sys  = require('./sys.js');

class TXTag {

    Name  = null;
    Value = null;

    constructor (name, value) { this.Name = name; this.Value = value; }


    static FromGQLEdgeTags (tags) 
    {
        if (tags == null)
            return [];

        const ta = [tags.length];
        for (const t of tags) 
        {
            ta.push(new TXTag(t.name, t.value));
        }
    }

    static FromArweaveTXTags(arweave_tx) {

        if (arweave_tx == null)
        {
            Sys.VERBOSE("Util.DecodeTags: No TX given.");
            return null;
        }

        const txid = tx.id;
        const len  = tx.tags != null ? tx.tags.length : 0;

        if (len <= 0)
            Sys.ERR("No tags obtained from transaction " + txid + " !");


        else 
        {
            const decoded_tags = [len];

            let tag;
            let e;
            for (let C = 0; C < len; ++C)
            {
                tag = tx.tags[C];
                e = new TXTag
                (
                    tag.get ('name',  { decode: true, string: true } ),
                    tag.get ('value', { decode: true, string: true } )
                );

                decoded_tags.push(e);
            }
            return decoded_tags;
        }

        return null;
    }


    toString () { return this.Name + ":" + this.Value; }

    ToGQL () 
    {
        return "{name:\"" + this.Name + "\",values:["
            + (Array.isArray (this.Value) ? Util.ArrayToStr (this.Value, { entry_separator: ",", values_in_quotes: true })
                                          : "\"" + this.Value + "\"")
            + "]}";

    }

    
    HasValue(value, case_sensitive = true)
    {
        return case_sensitive ? this.Value == value : this.Value?.toLowerCase () == value?.toLowerCase ();
    }


    static TAGS_TO_GQL (tags)
    {
        if (tags == null || tags.length <= 0)
            return "";

        let str = "tags:[";
        let comma = false;
        for (const t of tags)
        {
            str += (comma ? "," : "") + t.ToGQL ();
            comma = true;
        }
        str += "]";

        return str;
    }

    static ADD_NATIVE_TAGS (tags, src) 
    {
        if (tags == null || src == null || src.length <= 0) 
        {
            Sys.ERR_PROGRAM("'tags' and/or 'src' is null or src has no entries.", "TXTags.ADD_NATIVE_TAGS");
            return;
        }

        for (const t of src) 
        {
            if (t.name != null && t.values != null)
                tags.push (new TXTag (t.name, t.values) );

            else
                Sys.ERR_ONCE("Tag not in corrent format - need to be { name:'foo', values:['bar','baz'] } - " + Util.ObjToStr (t), "TXTag.ADD_NATIVE_TAGS");
        }
    }

    static GET_TAG (tags = [], tag, case_sensitive = true)
    {
        if (!tag)
        {
            Sys.ERR_PROGRAM("'tag' null.", "TXTag.GetTag");
            return null;
        }

        else
            return tags?.find(e => Util.StrCmp(e, tag, !case_sensitive));
    }

    static GET_TAGVALUE (tags = [], tag, case_sensitive = true)
    {
        return TXTag.GET_TAG (tags, tag, case_sensitive)?.Value;
    }

    static HAS_TAG (tags = [], tag, value = null, case_sensitive = true)
    {
        const tag_obj = TXTag.GET_TAG (tags, tag, case_sensitive);
        return tag_obj != null && (value == null || tag_obj.HasValue (value, case_sensitive));
    }

}


module.exports = TXTag;