//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CONST_SART.js - 2021-11-25_01
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

const TXSTATUS_OK               = 200;
const TXSTATUS_PENDING          = 202;
const TXSTATUS_NOTFOUND         = 404;

const ENDPOINT_PENDING          = "tx/pending";

const GQL_MAX_RESULTS            = 100;
const GQL_SORT_HEIGHT_DESCENDING = 'HEIGHT_DESC';
const GQL_SORT_HEIGHT_ASCENDING  = 'HEIGHT_ASC';
const GQL_SORT_OLDEST_FIRST      = GQL_SORT_HEIGHT_ASCENDING;
const GQL_SORT_NEWEST_FIRST      = GQL_SORT_HEIGHT_DESCENDING;
const GQL_SORT_DEFAULT           = GQL_SORT_HEIGHT_ASCENDING;
const GQL_VALID_SORT             = [ GQL_SORT_HEIGHT_ASCENDING, GQL_SORT_HEIGHT_DESCENDING ];

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

function IS_GQL_SORT_VALID (sort) { return VALID_SORT.includes (sort?.toUpperCase() ); }



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


class Setting
{
    Name         = null;
    DefaultValue = null;
    ReadOnly     = false;
    Deprecated   = false; 
    
    constructor (name) { this.Name = name; }

    DV               (value) { this.DefaultValue = value; return this; }       
    RO               ()      { this.ReadOnly     = true;  return this; }
    DEPR             ()      { this.Deprecated   = true;  return this; }

    GetName          ()      { return this.Name;                       }
    GetKey           ()      { return this.Name;                       }
    GetDefaultValue  ()      { return this.DefaultValue;               }
    CanBeModified    ()      { return !this.ReadOnly;                  }
}



const SETTINGS =
{
    Type                    : new Setting ("Type")                     .DV ("SARTConfig").RO (),
    Description             : new Setting ("Description")              .DV ("SART configuration/settings"),
    ConfigVersion           : new Setting ("ConfigVersion")            .DV (CONFIG_VERSION).RO (),
    AppVersion              : new Setting ("AppVersion")               .DV (Package.version).RO (),
    AppVersionCode          : new Setting ("AppVersionCode")           .DV (Package.versioncode).RO (),
    LogLevel                : new Setting ("LogLevel")                 .DV (IS_TTY ? LOGLEVELS.MSG : LOGLEVELS.NOMSG),
    MsgOut                  : new Setting ("MsgOut")                   .DV (OUTPUTDESTS.STDOUT),
    ErrOut                  : new Setting ("ErrOut")                   .DV (OUTPUTDESTS.STDERR),
    ArweaveHost             : new Setting ("ArweaveHost")              .DV ("arweave.net"),
    ArweavePort             : new Setting ("ArweavePort")              .DV (443),
    ArweaveProto            : new Setting ("ArweaveProto")             .DV ("https"),
    ArweaveTimeout_ms       : new Setting ("ArweaveTimeout_ms")        .DV (100000),
    ManualDest              : new Setting ("ManualDest")               .DV (false),
    Recursive               : new Setting ("Recursive")                .DV (false),
    DisplayAll              : new Setting ("DisplayAll")               .DV (false),
    AllowWildcards          : new Setting ("AllowWildcards")           .DV (true),
    ConcurrentDelay_ms      : new Setting ("ConcurrentDelay_ms")       .DV (200),
    ErrorWaitDelay_ms       : new Setting ("ErrorWaitDelay_ms")        .DV (5000),
    ErrorWaitVariationP     : new Setting ("ErrorWaitVariationP")      .DV (1.0),
    ErrorRetries            : new Setting ("ErrorRetries")             .DV (3),
    MaxConcurrentFetches    : new Setting ("MaxConcurrentFetches")     .DV (5),
    OutputFields            : new Setting ("OutputFields")             .DV (null),
    OutputFormat            : new Setting ("OutputFormat")             .DV (OUTPUTFORMATS.TXT),
    OutputFieldsCaseSens    : new Setting ("OutputFieldsCaseSens")     .DV (false),
    SizeDigits              : new Setting ("SizeDigits")               .DV (5),
    VarNamesUppercase       : new Setting ("VarNamesUppercase")        .DV (false),
    ANSIAllowed             : new Setting ("ANSIAllowed")              .DV (true),
    CSVReplacePeriodWith    : new Setting ("CSVReplacePeriodWith")     .DV ("#!#"),
    JSONSpacing             : new Setting ("JSONSpacing")              .DV (3),
    VerifyDefaults          : new Setting ("VerifyDefaults")           .DV ("SUMMARY,NOT-VERIFIED"),
    VerifyDefaults_Numeric  : new Setting ("VerifyDefaults_Numeric")   .DV ("SUMMARY,ALL"),
    ArFSEntityTryOrder      : new Setting ("ArFSEntityTryOrder")       .DV ("drive,file,folder"),
    QueryMinBlockHeight     : new Setting ("QueryMinBlockHeight")      .DV (null),
    QueryMaxBlockHeight     : new Setting ("QueryMaxBlockHeight")      .DV (null),
    IncludeInvalidTX        : new Setting ("IncludeInvalidTX")         .DV (false),
    Force                   : new Setting ("Force")                    .DV (false),
    MaxArFSMetadataSize     : new Setting ("MaxArFSMetadataSize")      .DV (1073741824), // 1MB ought to be enough for anybody?
    MaxTXFormat             : new Setting ("MaxTXFormat")              .DV (2),
    MinArFSVersion          : new Setting ("MinArFSVersion")           .DV (0.11),
    MaxArFSVersion          : new Setting ("MaxArFSVersion")           .DV (0.11),
    ArFSTXQueryTags         : new Setting ("ArFSTXQueryTags")          .DV ([ {name:"App-Name", values:["ArDrive","ArDrive-Web","ArDrive-CLI","ArDrive-Desktop","ArDrive-Sync"] } ]),
    SafeConfirmationsMin    : new Setting ("SafeConfirmationsMin")     .DV (15),
    TXTagsMaxTotalBytes     : new Setting ("TXTagsMaxTotalBytes")      .DV (CONFIG_TX_TAGS_TOTAL_SIZE),
    LessFiltersMode         : new Setting ("LessFiltersMode")          .DV (false),
    ContainerMode           : new Setting ("ContainerMode")            .DV (false),
    DefaultCommand          : new Setting ("DefaultCommand")           .DV ("console"),
    DefaultCommandParam     : new Setting ("DefaultCommandParam")      .DV (null),
}
Object.freeze (SETTINGS);








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
    SETTINGS,
    Setting,
};