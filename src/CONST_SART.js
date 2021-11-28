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

const CONFIG_VERSION            = 1;
const CONFIG_FILESIZE_MAX_BYTES = 83886080;
const CONFIGFILE_ENCODING       = "utf-8";
const CONFIG_RECURSIVE_FIELDS   = ["ArFSTXQueryTags"]
const CONFIG_LOCKED_ITEMS       = ["Type", "ConfigVersion", "AppVersion", "AppVersionCode"];

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

const HTTP_STATUS_OK             = 200;

const ERROR_IDS =
{
    TXFORMAT_UNSUPPORTED     : 1,
    SORT_NOT_SET             : 2,
    ARFS_ENTITY_TYPE_UNKNOWN : 3,
    ARFS_ID_INVALID          : 4
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




const CONFIG_DEFAULT =
{
    Type                   : "SART config",
    ConfigVersion          : CONFIG_VERSION,
    AppVersion             : Package.version,
    AppVersionCode         : Package.versioncode,

    LogLevel               : IS_TTY ? LOGLEVELS.MSG : LOGLEVELS.NOMSG,
    MsgOut                 : OUTPUTDESTS.STDOUT,
    ErrOut                 : OUTPUTDESTS.STDERR,
              
    ArweaveHost            : "arweave.net",
    ArweavePort            : 443,
    ArweaveProto           : "https",
    ArweaveTimeout_ms      : 100000,   
    ManualDest             : false,
          
    Recursive              : false,
    DisplayAll             : false,    
    AllowWildcards         : true,
    ConcurrentDelay_ms     : 200,
    ErrorWaitDelay_ms      : 5000,
    ErrorWaitVariationP    : 1.0,
    ErrorRetries           : 3,
      
    OutputFields           : null,
    OutputFormat           : OUTPUTFORMATS.TXT,
    SizeDigits             : 5,
    VarNamesUppercase      : false,
    ANSIAllowed            : true,
    CSVReplacePeriodWith   : "#!#",
    JSONSpacing            : 3,

    VerifyDefaults         : "SUMMARY,NOT-VERIFIED",
    VerifyDefaults_Numeric : "SUMMARY,ALL",

    ArFSEntityTryOrder     : "drive,file,folder",
    QueryMinBlockHeight    : null,
    QueryMaxBlockHeight    : null,

    Force                  : false,
      
    MaxArFSMetadataSize    : 1073741824, // 1MB ought to be enough for anybody?
    MaxTXFormat            : 2,
    MinArFSVersion         : 0.11,
    MaxArFSVersion         : 0.11,
    // Set to null to query solely based on tags like Entity-Type, Drive-Id etc.
    ArFSTXQueryTags        : [ {name:"App-Name", values:["ArDrive","ArDrive-Web","ArDrive-CLI","ArDrive-Desktop","ArDrive-Sync"] } ],
    SafeConfirmationsMin   : 15,

    LessFiltersMode        : false,
    ContainerMode          : false,
  
};





module.exports = 
{         
    CONFIG_VERSION,
    CONFIG_FILESIZE_MAX_BYTES,
    CONFIGFILE_ENCODING,
    CONFIG_RECURSIVE_FIELDS,
    CONFIG_LOCKED_ITEMS,
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
    
    LOGLEVELS, 
    OUTPUTDESTS, 
    OUTPUTFORMATS,
    CONNSTATES,   
    SYSTEM_ACCESS,
    CONFIG_DEFAULT, 
};