//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Concurrent.js - 2021-11-25_01
// 
// Manages concurrent fetches (downloads).
//

const Sys        = require ("./System");
const Settings   = require ("./Settings");
const State      = require ("./ProgramState");
const SARTObject = require("./SARTObject");


var NextID = 1;


State.ActiveConcurrentFetches = [];


class Fetch extends SARTObject
{       
    ID            = null;
    Name          = null;
    Running       = false;
    Finished      = false;
    Prom          = null;
    Instance      = null;
    Value         = null;
    Slot          = null;
    StartAttempts = 0;
    

    constructor (promise, name = null)
    {
        super ();

        if (promise == null)
            return Sys.ERR_PROGRAM ("'func' null.", "Concurrent.Fetch");

        this.Prom = promise;
        this.Name = name;
        this.ID   = NextID++;
    }

    static GET_FREE_SLOTS_AMOUNT ()  { return State.ActiveConcurrentFetches != null ? State.ActiveConcurrentFetches.length : 0 }


    IsRunning      () { return this.Running;  }
    IsFinished     () { return this.Finished; }
    toString       () { return "Fetch #" + this.ID + (this.Name != null ? "[" + this.Name + "]" : ""); }
    GetReturnValue () { if (this.IsFinished () ) return this.Value; else Sys.ERR_PROGRAM ("GetReturnValue: Fetch " + this + " not yet finished!"); return null; }





    /** Batch can either consist of Fetch-objects or Promises. */
    async Execute ()
    {    

        if (this.IsRunning () )
        {
            Sys.ERR_PROGRAM ("Fetch.Execute (): " + fetch + " already running!");
            return false;
        }

        if (this.IsFinished ())
        {
            Sys.ERR_PROGRAM ("Fetch already finished.", this);
            return false;
        }


        // If this returns true, a free slot was available
        // and the fetch was done.
        if (await this.__Start () )
            return true;
                


        // Wait for tasks to finish, then try to start
        else while (! this.IsFinished () )
        {
            await Fetch.AWAIT_FOR_FREE_SLOT ();

            if (await this.__Start () )
                return true;
        }
            
    }

    async __Start ()
    {
        const free_slot = this.__FindFreeSlot ();
        if (free_slot != null)
        {
            this.Instance = this.__DoExecute (free_slot);
            await this.Instance;
            return true;
        }
        else
            return false;
    }
  

    __FindFreeSlot ()
    {
        const max_slots = Settings.GetMaxConcurrentFetches ();

        for (let i = 0; i < max_slots; ++i)
        {
            if (State.ActiveConcurrentFetches[i] == null)
                return i;            
        }
        return null;
    }

    static async AWAIT_FOR_FREE_SLOT ()
    {        
        const awaitlist = [];
        
        for (const a of State.ActiveConcurrentFetches)        
        {            
            if (a != null && a.Instance != null)
                awaitlist.push (a.Instance);
        }

        if (awaitlist.length > 0)
            await Promise.race (awaitlist);        
    }
    

    async __DoExecute (slot)
    {   
        if (State.ActiveConcurrentFetches[slot] != null)
            return Sys.ERR_PROGRAM ("Tried to start " + this + " in a slot #" + slot + " occupied by " + State.ActiveConcurrentFetches[slot] + "!");
      
        State.ActiveConcurrentFetches[slot] = this;

        this.Slot     = slot;
        this.Value    = null;
        this.Finished = false;
        this.Running  = false;
        
        Sys.DEBUG (this + " exec start at slot " + this.Slot + ".");

        this.Value = await this.Prom; 

        Sys.DEBUG (this + " done, slot " + this.Slot + " free.");

        State.ActiveConcurrentFetches[slot] = null;
        this.Running  = false;
        this.Finished = true;
        this.Slot     = null;
        this.Instance = null;
 
        State?.GetActiveTask ()?.IncrementFetchesBy (1);
    }
    
}




module.exports = Fetch;