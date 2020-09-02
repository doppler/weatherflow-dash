import {
  config,
  v4,
  WebSocket,
  isWebSocketCloseEvent,
} from "./deps.ts";
import { WfData, WfMessageObj } from "./types.d.ts";
const ENV = config();

// used to truncate data length
const MAX_RAPID_WIND_ENTRIES = (60 / 3) * 60;
const MAX_OBS_ST_ENTRIES = 60;

const WEATHERFLOW_API_KEY = Deno.env.toObject()["WEATHERFLOW_API_KEY"];
const WEATHERFLOW_DEVICE_ID = Deno.env.toObject()["WEATHERFLOW_DEVICE_ID"];

const endpoint =
  `wss://ws.weatherflow.com/swd/data?api_key=${WEATHERFLOW_API_KEY ||
    ENV.WEATHERFLOW_API_KEY}`;

const clientsMap = new Map();

let data: WfData = {
  summary: {},
  rapid_wind: [],
  obs_st: [],
};
let jsonText = JSON.stringify(data);
try {
  jsonText = await Deno.readTextFile("data.json");
} catch (e) {
  console.log("data.json did not exist");
}
data = JSON.parse(jsonText);

const sendMessage = (message: any) => {
  // console.log(message);
  clientsMap.forEach((client) => {
    if (client.ws._isClosed) {
      clientsMap.delete(client.clientId);
    } else {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (e) {
        console.error(`Error sending message to ${client.clientId}`, client.ws);
      }
    }
  });
};
const wsClient: WebSocket = new WebSocket(endpoint);

wsClient.on("open", function () {
  console.log("wsClient connected!");
  sendStartRequests();
});

wsClient.on("close", (event: any) => {
  console.log("close", event);
});

wsClient.on("message", async function (message: string) {
  const messageObj: WfMessageObj = JSON.parse(message);
  console.log(
    messageObj.type,
    messageObj.type === "obs_st"
      ? messageObj.obs[0]
      : messageObj.type === "rapid_wind"
      ? messageObj.ob
      : messageObj,
  );
  switch (messageObj.type) {
    case "rapid_wind":
      data.rapid_wind.push(messageObj.ob);
      data.rapid_wind.length > MAX_RAPID_WIND_ENTRIES &&
        data.rapid_wind.shift();
      sendMessage({ type: "rapid_wind", rapid_wind: data.rapid_wind });
      break;
    case "obs_st":
      data.obs_st.push(messageObj.obs[0]);
      data.obs_st.length > MAX_OBS_ST_ENTRIES && data.obs_st.shift();
      sendMessage({ type: "obs_st", obs_st: data.obs_st });
      data.summary = messageObj.summary;
      sendMessage({ type: "summary", summary: data.summary });
    default:
      break;
  }
  await Deno.writeTextFile("data.json", JSON.stringify(data));
});

const sendStartRequests = (): void => {
  const device_id = WEATHERFLOW_DEVICE_ID || ENV.WEATHERFLOW_DEVICE_ID;
  wsClient.send(JSON.stringify({
    device_id,
    type: "listen_rapid_start",
    id: v4.generate(),
  }));
  wsClient.send(JSON.stringify({
    device_id,
    type: "listen_start",
    id: v4.generate(),
  }));
};

export const handleWs = async (ws: any) => {
  let clientId = v4.generate();

  for await (let message of ws) {
    const event = typeof message === "string" ? JSON.parse(message) : message;
    console.log(message);
    if (isWebSocketCloseEvent(message)) {
      console.log(`removing ${clientId}`);
      clientsMap.delete(clientId);
    }
    if (event.join) {
      console.log(`adding ${clientId}`);
      clientsMap.set(clientId, {
        clientId,
        ws,
      });
      const { summary, obs_st, rapid_wind } = data;
      sendMessage({ type: "all", data: { summary, obs_st, rapid_wind } });
    }
  }
};
