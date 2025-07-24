import { fetchWeatherApi } from "openmeteo";
import * as weatherUtils from "./weatherUtils";
import { App, AppSettings, GenericTransitData } from "@deskthing/types";
import { createDeskThing } from "@deskthing/server";
import { ToClientData, WeatherData } from "./types";

const DeskThing = createDeskThing<GenericTransitData, ToClientData>();

class WeatherService {
  private weatherData: WeatherData;
  private lastUpdateTime: Date | null;
  private updateTaskId: (() => void) | null = null;
  private static instance: WeatherService | null = null;
  private speed_unit: string = "mph";
  private temp_unit: string = "f";
  private longitude: string = "0";
  private latitude: string = "0";
  private settings: AppSettings | null  = null


  constructor(settings: AppSettings|null ) {
    this.settings = settings;
    this.updateWeather();
    this.scheduleHourlyUpdates();
  }

  static getInstance(): WeatherService {
    let settings: AppSettings|null = null
    DeskThing.getSettings().then(
      (ret) => {
        settings = ret 
      }
    )
    console.log("First Load Success")

    console.log(settings)
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService(settings);
    }
    return WeatherService.instance;
  }



  private async updateWeather() {
    console.log("Debug Update Weather")
    console.log(this.settings)
    if(this.settings == null){
      this.settings = await DeskThing.getSettings()
    }
    console.log("Updated v2")
    console.log(this.settings)
    
    console.debug("Updating weather data...");
    if (!this?.settings?.latitude || !this?.settings.longitude || this?.settings?.latitude?.value == "0" || this?.settings?.longitude?.value == "0") {
        console.warn("No latitude or longitude set! Not updating weather data");
        return
    }
    
    console.debug("Updating weather data...");
    const params = {
      latitude: this?.settings?.latitude?.value,
      longitude: this?.settings?.longitude?.value,
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "apparent_temperature",
        "precipitation_probability",
        "precipitation",
        "rain",
        "showers",
        "snowfall",
        "snow_depth",
        "cloud_cover",
        "visibility",
        "wind_speed_10m",
        "wind_direction_10m",
        "uv_index",
      ],
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "rain",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ],
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_mean",
      ],
      temperature_unit: this?.settings?.temp_unit?.value == "f" ? "fahrenheit" : "celsius",
      wind_speed_unit: this?.settings?.speed_unit?.value == "mph" ? "mph" : "kmh",
      timeformat: "unixtime",
      forecast_days: 1,
      models: "best_match",
      // blurred: this.blurred,
      // from: this.from,
      // mid: this.mid ,
      // to: this.to,
    };
    
    const url = weatherUtils.url;
    console.debug(
      `Fetching weather data from OpenMeteo API with params: ${JSON.stringify(
        params
      )}`
    );
    
    const responses = await fetchWeatherApi(url, params);

    const response = responses[0];
    const timezone = response.timezone();
    const timezoneAbbreviation = response.timezoneAbbreviation();
    const hourly = response.hourly()!;
    const current = response.current()!;
    const daily = response.daily()!;
    const utcOffsetSeconds = response.utcOffsetSeconds();

    console.debug(`Weather data received from OpenMeteo API.`);

    this.weatherData = {
      hourly: {
        time: weatherUtils
          .range(
            Number(hourly.time()),
            Number(hourly.timeEnd()),
            hourly.interval()
          )
          .map((t) => new Date((t + response.utcOffsetSeconds()) * 1000)),
        temperature2m: hourly.variables(0)!.valuesArray()!,
        relativeHumidity2m: hourly.variables(1)!.valuesArray()!,
        dewPoint2m: hourly.variables(2)!.valuesArray()!,
        apparentTemperature: hourly.variables(3)!.valuesArray()!,
        precipitationProbability: hourly.variables(4)!.valuesArray()!,
        precipitation: hourly.variables(5)!.valuesArray()!,
        rain: hourly.variables(6)!.valuesArray()!,
        showers: hourly.variables(7)!.valuesArray()!,
        snowfall: hourly.variables(8)!.valuesArray()!,
        snowDepth: hourly.variables(9)!.valuesArray()!,
        cloudCover: hourly.variables(10)!.valuesArray()!,
        visibility: hourly.variables(11)!.valuesArray()!,
        windSpeed10m: hourly.variables(12)!.valuesArray()!,
        windDirection10m: hourly.variables(13)!.valuesArray()!,
        uvIndex: hourly.variables(14)!.valuesArray()!,
      },
      current: {
        time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
        temperature2m: current.variables(0)!.value(),
        relativeHumidity2m: current.variables(1)!.value(),
        apparentTemperature: current.variables(2)!.value(),
        isDay: current.variables(3)!.value(),
        precipitation: current.variables(4)!.value(),
        rain: current.variables(5)!.value(),
        cloudCover: current.variables(6)!.value(),
        windSpeed10m: current.variables(7)!.value(),
        windDirection10m: current.variables(8)!.value(),
        windGusts10m: current.variables(9)!.value(),
      },
      daily: {
        time: weatherUtils
          .range(
            Number(daily.time()),
            Number(daily.timeEnd()),
            daily.interval()
          )
          .map((t) => new Date((t + utcOffsetSeconds) * 1000)),
        temperature2mMax: daily.variables(0)!.valuesArray()!,
        temperature2mMin: daily.variables(1)!.valuesArray()!,
        precipitationProbabilityMean: daily.variables(2)!.valuesArray()!,
      },
      tempUnit: this?.temp_unit,
      speedUnit: this?.speed_unit,
      longitude: this?.settings.longitude?.value,
      latitude: this?.settings.latitude?.value,
      // from: this.from,
      // mid: this.mid,
      // to: this.to,
      // blurred: this.blurred,
    };

    this.lastUpdateTime = new Date();
    console.log(this?.settings.temp_unit?.value)
    console.debug("Weather updated");
    DeskThing.send({ type: "weather_data", payload: this.weatherData });
  }

  private scheduleHourlyUpdates() {
    if (this.updateTaskId) {
      this.updateTaskId();
    }
    this.updateTaskId = DeskThing.addBackgroundTaskLoop(async () => {
      this.updateWeather();
      await this.sleep(15 * 60 * 1000);
    }); // Update every hour
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public updateData(data: AppSettings) {
    if (!data) {
      console.debug("No settings defined");
      return;
    }
    try {
      DeskThing.getSettings().then(
      (ret) => {
        if(ret != null)
          this.settings = ret 
      }
    )
      console.debug("Updating settings");
      this.updateWeather();      
    } catch (error) {
      console.debug("Error updating weather data: " + error);
    }
  }

  async stop() {
    this.lastUpdateTime = null;
  }

  public async getWeather(): Promise<WeatherData | undefined> {
    // If it's been more than an hour since the last update, update the weather data
    if (
      !this.lastUpdateTime ||
      new Date().getTime() - this.lastUpdateTime.getTime() > 15 * 60 * 1000
    ) {
      console.debug("Fetching weather data...");
      await this.updateWeather();
    } else {
      console.debug("Returning cached weather data");
    }
    console.debug("Returning weather data");
    return this.weatherData;
  }
}

export default WeatherService.getInstance();
