import { useEffect, useState } from "react";
import { createDeskThing } from '@deskthing/client';  // Import DeskThing client for Spotify data
import { IconPinwheel } from "../assets/Icons";
import { ToClientData, GenericTransitData, WeatherData } from "../types/weather"
import { DEVICE_CLIENT, CLIENT_REQUESTS, AppSettings } from "@deskthing/types"

const DeskThing = createDeskThing<ToClientData, GenericTransitData>()

interface WeatherProps {
  weatherData: WeatherData | null;
}

// Move getInstance() calls outside the hook to avoid redundant calls

const Simple = ({ weatherData }: WeatherProps) => {
  // Initial time fetched from SettingsStore

  // Moved all state variables to the top for better organization
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [time, setTime] = useState<string | null>(null)

  // State to store the Spotify thumbnail URL, start with a placeholder image
  const [thumbnail, setThumbnail] = useState<string | null>();
  
  useEffect(() => {
    
    const unsubscribe = DeskThing.on(DEVICE_CLIENT.SETTINGS, (settings) => {
      setSettings(settings.payload)
    })

    const fetchSettings = () => {
      DeskThing.getSettings() // will trigger the listener
    }


    const timeout = setTimeout(fetchSettings, 1000);

    return () => {
      unsubscribe()
      clearTimeout(timeout);
    }
  }, [])

  useEffect(() => {

    // Request current song data when component mounts

    const fetchSong = () => {
      DeskThing.send({ app: 'client', type: CLIENT_REQUESTS.GET, request: 'music' });
    }
    const timeout = setTimeout(fetchSong, 1000);
    
    // Listen for updates to song data
    const unsubscribe = DeskThing.on(DEVICE_CLIENT.MUSIC, (data) => {
      console.log(data?.payload)
      if (data?.payload?.thumbnail) {
        setThumbnail(data.payload.thumbnail); // Set the thumbnail URL with real data when available
      }
    });

    const removeTimeListener = DeskThing.on(DEVICE_CLIENT.TIME, (data) => {
      if (typeof data.payload === 'string') {
        setTime(data.payload);
      } else {
        const utcOffset = data.payload.timezoneOffset;
        const utcTime = data.payload.utcTime;
        const date = new Date(utcTime);
        date.setMinutes(date.getMinutes() + utcOffset);
        setTime(`${date.getUTCHours()}:${date.getUTCMinutes().toString().padStart(2, '0')}`);
      }
    });

    return () => {
      // Clean up listeners on unmount
      removeTimeListener();
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div 
      style={{
        backgroundSize: settings?.breathing?.value ? "400% 400%" : "cover",
        animation: settings?.breathing?.value ? `gradient-shift ${settings?.duration?.value}s ease infinite` : "none",
        position: "absolute",
        inset: 0,
        background: `linear-gradient(90deg, ${settings?.from?.value}  0%, ${settings?.mid?.value} 50%, ${settings?.to?.value} 100%)`,
      }} 
      className={`w-full h-full overflow-hidden`}>


      {/* Overlay to adjust the brightness by lowering opacity */}
      <div className="absolute inset-0"></div>

      {/* Content on top of background and overlay */}
      <div className="relative w-full h-full flex items-center justify-center z-20">
        
        {/* Left section: Temperature and Time */}
        <div
          className="flex flex-col text-white"
          style={{
            marginRight: '3vw',
            paddingLeft: '2vw', // To move content away from the left side
            paddingBottom: '4vh', // To shift everything a bit higher
          }}
        >
          {/* Temperature */}
          <p className="text-[23vw] font-montserrat font-extrabold leading-none">
            {weatherData ? Math.round(weatherData.current.apparentTemperature) + '°' : '00°'}
          </p>
          
          {/* Time */}
          <p className="text-[9vw] font-montserrat font-extralight leading-none tracking-tighter">
            {time}
          </p>
        </div>

        {/* Right section: Spotify Thumbnail */}
        {(
          <div
            className="flex-shrink-0"
            style={{
              width: '40vw',
              height: '40vw',
              marginLeft: '4vw', // Add some separation from the temperature and time
            }}
          >
            {thumbnail ? <img src={thumbnail} alt="Spotify album cover" className="object-cover w-full h-full rounded-lg" />
              :
              <div className="w-full h-full bg-zinc-800 rounded-lg flex flex-col items-center justify-center">
                <IconPinwheel className="animate-spin text-white stroke-2" iconSize={256} />
                <p className="font-HelveticaNeue text-white text-center text-2xl font-semibold">
                  Waiting for thumbnail
                </p>
                </div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Simple;
