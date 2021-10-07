import { graphql, contracts } from "@aavegotchi/sdk";
import axios from "axios";
import rateLimit from "axios-rate-limit";
import { green } from "chalk";
import debug from "debug";
const log = debug(`aavegotchi:metadata`);
const http = rateLimit(axios.create(), {
  maxRequests: 10,
  maxRPS: 10,
  perMilliseconds: 1000
});

const main = async () => {
  const r = await graphql.client().request(`{
    aavegotchis(first:1000, where: {
      owner: "${contracts.addresses.diamond[137].toLowerCase()}", gotchiId_not: null
    }) {
      gotchiId
    }
  }`);
  log(r, `# to refresh: ${r.aavegotchis.length}`);

  const pending = r.aavegotchis.map(({ gotchiId }) => {
    return [
      http
        .post(
          `https://api-mainnet.rarible.com/marketplace/api/v4/items/0x1906fd9c4ac440561f7197da0a4bd2e88df5fa70:${gotchiId}/meta/refresh`
        )
        .then(() => log(`success rarible for ${gotchiId}`))
        .catch(() => log(`fail rarible for ${gotchiId}`)),
      http
        .get(
          `https://api.opensea.io/api/v1/asset/0x1906fd9c4ac440561f7197da0a4bd2e88df5fa70/${gotchiId}/?force_update=true`
        )
        .then(() => log(`success opensea for ${gotchiId}`))
        .catch(() => log(`fail opensea for ${gotchiId}`))
    ];
  });

  const res = await Promise.allSettled(pending.flat());
  log(`${green(`✅`)} done ${r.aavegotchis.length} requests`, res);
};

main();
