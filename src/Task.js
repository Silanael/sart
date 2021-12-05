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
    Command   = null;
    Args      = null;
    StartTime = null;
    EndTime   = null;

    constructor (param = { cmd:null, args:null } )
    {
        super ();

        this.Command = param.cmd;
        this.Args    = param.args;
    }

    async Execute ()
    {        
        if (State.ActiveTask != null)
            this.OnError ("A task is already running.");

        else
        {            
            State.ActiveTask = this;
            this.StartTime = Util.GetUNIXTimeMS ();
            
            await this.__DoExecute ();
            
            this.EndTime = Util.GetUNIXTimeMS ();
            this.__DoOutput ();            
            Sys.VERBOSE ("Task finished in " + (this.EndTime - this.StartTime) + " ms.");
        }
    }

    /* Overridable, this implementation does nothing. */
    async __DoExecute () {}
    async __DoOutput  () {}
}



module.exports = Task;