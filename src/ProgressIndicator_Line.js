//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ProgressIndicator_Line.js - 2022-04-15_01
//
// A progress indicator that's drawn onto the line after most recent output.
//

const Sys  = require ("./System");
const Util = require ("./Util");


const ANIM_FRAMES = [ "/", "-", "\\", "|" ];


class ProgressIndicator_Line
{

    Caption;
    Delay_MS;
    CurrentFrame;
    Active = false;

    async Start ( {caption = "Doing something", delay_ms = 120 } )
    {
        this.Caption      = caption;
        this.Delay_MS     = delay_ms;
        this.CurrentFrame = 0;

        Sys.DEBUG ("Starting ProgressIndicator_Line...");

        if (this.Caption != null)
            Sys.OUT_TXT_RAW (this.Caption + " ");

        Sys.OUT_TXT_RAW (ANIM_FRAMES [this.CurrentFrame] + " " );

        while (Active)
        {
            await Util.Delay (this.Delay_MS);

            ++this.CurrentFrame;
            if (this.CurrentFrame >= ANIM_FRAMES.length)
                this.CurrentFrame = 0; 

            if (Active)
                Sys.OUT_TXT_RAW ("\b\b" + ANIM_FRAMES [this.CurrentFrame] + " ");
        }

        Sys.OUT_NEWLINE ();
        
        Sys.DEBUG ("ProgressIndicator_Line exiting.");       
    }

    Stop ()
    {
        Sys.DEBUG ("Stopping ProgressIndicator_Line...");
        this.Active = false;
    }

}


modules.export = ProgressIndicator_Line;