import * as React from "react"

const Slider = React.forwardRef(({ className, ...props }, ref) => (
  <div
    className={`relative flex w-full touch-none select-none items-center ${className}`}
    dir={props.dir || "ltr"}
  >
    <input
      type="range"
      ref={ref}
      {...props}
      value={props.value?.[0] || props.value || 0}
      onChange={(e) => {
        if (props.onValueChange) {
          props.onValueChange([parseInt(e.target.value)]);
        }
      }}
      className="w-full h-2 bg-horizon-card rounded-lg appearance-none cursor-pointer slider-thumb"
      style={{
        background: `linear-gradient(to right, var(--horizon-primary) 0%, var(--horizon-primary) ${((props.value?.[0] || props.value || 0) - (props.min || 0)) / ((props.max || 100) - (props.min || 0)) * 100}%, var(--horizon-card-bg) ${((props.value?.[0] || props.value || 0) - (props.min || 0)) / ((props.max || 100) - (props.min || 0)) * 100}%, var(--horizon-card-bg) 100%)`
      }}
    />
    <style jsx>{`
      .slider-thumb::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--horizon-primary);
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .slider-thumb::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--horizon-primary);
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
    `}</style>
  </div>
))
Slider.displayName = "Slider"

export { Slider }