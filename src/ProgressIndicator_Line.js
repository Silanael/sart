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

    Active        = false;
    LineDrawn     = false;

    Caption;
    CaptionUpper;
    Delay_MS;
    CurrentFrame;
    OutputDest;

    async Start ( {caption = "Doing something", delay_ms = 120 } )
    {
        this.Caption      = caption;
        this.CaptionUpper = caption.toUpperCase ();
        this.Delay_MS     = delay_ms;
        this.CurrentFrame = 0;
        this.Active       = true;

        Sys.DEBUG ("Starting ProgressIndicator_Line...");

        this.OutputDest = Sys.OUTPUTDEST_STDOUT;
        this.OutputDest.HookIndicator (this);
        
        while (this.Active)
        {
            await Util.Delay (this.Delay_MS);

            ++this.CurrentFrame;
            if (this.CurrentFrame >= ANIM_FRAMES.length)
                this.CurrentFrame = 0; 

            if (this.Active)
                this.OutputDest.DrawIndicator ();
                //Sys.OUT_STDERR ("\b\b" + ANIM_FRAMES [this.CurrentFrame] + " ");

        }

        //Sys.OUT_NEWLINE ();
        this.OutputDest.UnhookIndicator ();
        this.OutputDest = null;

        Sys.DEBUG ("ProgressIndicator_Line exiting.");       
    }

    Stop ()
    {
        Sys.DEBUG ("Stopping ProgressIndicator_Line...");
        this.Active = false;
    }

    GetStr ()
    {
        if (this.Active)
            return "### " + (this.Caption != null ? this.CaptionUpper + " " : "") + ANIM_FRAMES [this.CurrentFrame] + " ###";
            
        else 
            return "";

        /*
        this.__Clear ();

        if (this.Caption != null)
            this.OutputDest.OutputChars (this.Caption + " ");

        this.OutputDest.OutputChars (ANIM_FRAMES [this.CurrentFrame] + " " );
        
        this.LineDrawn = true;
        */
    }

    __Clear ()
    {
        if (this.LineDrawn)
        {
            this.OutputDest.ClearLine ();
            this.LineDrawn = true;
        }
    }

    OnOutputPre ()
    {        
        this.__Clear ();
    }

    OnOutputPost ()
    {
        this.__Draw ();
    }

}


module.exports = ProgressIndicator_Line;