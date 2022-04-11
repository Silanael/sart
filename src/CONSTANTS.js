//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CONSTANTS.js - 2021-11-25_01
//
// Constants values for SART.
//

const Package                   = require ("../package.json");
const IS_TTY                    = process.stdout.isTTY;

const CONFIG_VERSION            = 2;

const CONFIG_FILESIZE_MAX_BYTES = 83886080;
const CONFIGFILE_ENCODING       = "utf-8";
const CONFIG_RECURSIVE_FIELDS   = ["ArFSTXQueryTags"]
const CONFIG_TX_TAGS_TOTAL_SIZE = 2048;

const COMMAND_DEFAULT           = "console"
const COMMAND_DEFAULT_ARGS      = [];

const LISTMODE_TABLE            = "tbl";
const LISTMODE_SEPARATE         = "sep";

const TXSTATUS_OK               = 200;
const TXSTATUS_PENDING          = 202;
const TXSTATUS_NOTFOUND         = 404;

const TXSTATUSES_POST_OK        = [200, 208];

const ENDPOINT_PENDING          = "tx/pending";

const GQL_MAX_RESULTS            = 100;
const GQL_SORT_HEIGHT_DESCENDING = 'HEIGHT_DESC';
const GQL_SORT_HEIGHT_ASCENDING  = 'HEIGHT_ASC';
const GQL_SORT_OLDEST_FIRST      = GQL_SORT_HEIGHT_ASCENDING;
const GQL_SORT_NEWEST_FIRST      = GQL_SORT_HEIGHT_DESCENDING;
const GQL_SORT_DEFAULT           = GQL_SORT_HEIGHT_ASCENDING;
const GQL_VALID_SORT             = [ GQL_SORT_HEIGHT_ASCENDING, GQL_SORT_HEIGHT_DESCENDING ];

const UTIL_ARRAYTOSTR_DEFAULTS   = { entry_separator: ", ", values_in_quotes: false };

function FUNC_ALWAYS_TRUE        () { return true;  }
function FUNC_ALWAYS_FALSE       () { return false; }


const HTTP_STATUS_OK             = 200;

const ERROR_IDS =
{
    TXFORMAT_UNSUPPORTED      : 1,
    TAG_TOTAL_MAX_SIZE_EXCEED : 2,
    SORT_NOT_SET              : 3,
    ARFS_ENTITY_TYPE_UNKNOWN  : 4,
    ARFS_ID_INVALID           : 5
}

const TXTAGS = 
{
    CONTENT_TYPE     : "Content-Type",
    APP_NAME         : "App-Name",
    APP_VERSION      : "App-Version",
    PROTOCOL_NAME    : "Protocol-Name",
    PROTOCOL_VERSION : "Protocol-Version",
    BUNDLE_FORMAT    : "Bundle-Format",
    BUNDLE_VERSION   : "Bundle-Version",
    UNIX_TIME        : "Unix-Time",
    TYPE             : "Type",
}

function IS_GQL_SORT_VALID (sort) { return GQL_VALID_SORT.includes (sort?.toUpperCase() ); }



// Whether to allow the program to access the system,
// restricting fopen and SYS if set to false.
const SYSTEM_ACCESS  = true;


const LOGLEVELS =
{
    QUIET   : 0,
    NOMSG   : 1,
    MSG     : 2,
    VERBOSE : 3,
    DEBUG   : 4
};


const OUTPUTDESTS =
{
    NONE    : 0,
    STDOUT  : 1,
    STDERR  : 2,
    FILE    : 4,

    BOTH    : 3    
};



const OUTPUTFORMATS =
{
    TXT     : "txt",
    LIST    : "list",
    CSV     : "csv",
    HTML    : "html",
    JSON    : "json",
}

const CONNSTATES =
{
    NOTCONN : "NOT CONNECTED",
    OK      : "OK",
    FAIL    : "FAILED",
}

const FLAGS =
{
    HASWARNINGS    : 1,
    HASERRORS      : 2,
    
    TX_HASDATA     : 4,
    TX_HASTRANSFER : 8,
    TX_ISBUNDLE    : 16,
    TX_ISLOGICAL   : 32,

}




module.exports = 
{         
    CONFIG_VERSION,
    CONFIG_FILESIZE_MAX_BYTES,
    CONFIGFILE_ENCODING,
    CONFIG_RECURSIVE_FIELDS,
    IS_TTY,

    TXSTATUS_OK,
    TXSTATUS_PENDING,
    TXSTATUS_NOTFOUND,
    ENDPOINT_PENDING,


    GQL_MAX_RESULTS,
    GQL_SORT_HEIGHT_DESCENDING,
    GQL_SORT_HEIGHT_ASCENDING ,
    GQL_SORT_OLDEST_FIRST,
    GQL_SORT_NEWEST_FIRST,
    GQL_SORT_DEFAULT,
    GQL_VALID_SORT,
    HTTP_STATUS_OK,
    ERROR_IDS,
    IS_GQL_SORT_VALID,
    FUNC_ALWAYS_TRUE,
    FUNC_ALWAYS_FALSE,
    LOGLEVELS, 
    OUTPUTDESTS, 
    OUTPUTFORMATS,
    CONNSTATES,   
    SYSTEM_ACCESS,
    COMMAND_DEFAULT,
    COMMAND_DEFAULT_ARGS,
    CONFIG_TX_TAGS_TOTAL_SIZE,
    FLAGS,
    TXTAGS,
    UTIL_ARRAYTOSTR_DEFAULTS,
    LISTMODE_TABLE,
    LISTMODE_SEPARATE,
    TXSTATUSES_POST_OK
};