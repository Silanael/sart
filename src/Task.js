//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Task.js - 2021-12-04_01
// 
// A class holding the runtime info
// for an operation, such as LIST or INFO.
//

const SARTObject = require ("./SARTObject");
const State      = require ("./ProgramState");
const Util       = require ("./Util");
const Sys        = require ("./System");


class Task extends SARTObject
{
    Name      = null;
    Command   = null;
    Args      = null;
    StartTime = null;
    EndTime   = null;
    Success   = null;
    Fetches   = 0;

    constructor (param = { cmd:null, args:null } )
    {
        super ();

        this.Command = param.cmd;
        this.Args    = param.args;
    }

    /** Gets the time the task took. Call after completion. */
    GetDurationMs  () { return this.StartTime != null && this.EndTime != null ? this.EndTime - this.StartTime : null }
    GetDurationSec () { return this.GetDurationMs () / 1000; }

    /* Gets the duration if the task is completed, current runtime otherwise. */
    GetRuntimeMs   () { return this.StartTime != null ? (this.EndTime != null ? this.EndTime : Util.GetUNIXTimeMS () ) - this.StartTime : null };
    GetRuntimeSec  () { return this.GetRuntimeMs () / 1000; }

    GetFetchesAmount   ()       { return this.Fetches != null ? this.Fetches : 0 }
    IncrementFetchesBy (amount) { this.Fetches += amount;                        }
    WasSuccessful      ()       { return this.Success;                           }

    async Execute ()
    {        
        if (State.ActiveTask != null)
            this.OnError ("A task is already running.");

        else
        {            
            State.ActiveTask = this;
            this.StartTime = Util.GetUNIXTimeMS ();
            
            this.Success = await this.__DoExecute ();
            
            this.EndTime = Util.GetUNIXTimeMS ();
            
            this.__DoOutput ();

            Sys.VERBOSE ("");        
            Sys.VERBOSE ("Task finished in " + this.GetRuntimeMs () + " ms with " + Util.AmountStr (this.Fetches, "fetch", "fetches") + "." );
        }
    }

    /* Overridable, this implementation does nothing. */
    async __DoExecute () { return true; }
    async __DoOutput  () { }
}



module.exports = Task;