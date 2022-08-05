import Foswig from "foswig";
import whois from "whois";
import chalk from "chalk";
import readline from "readline";
import { syllable } from "syllable";

import dictionary from "./datasets/dictionary.js";
import companies from "./datasets/companies.js";
import fortune from "./datasets/fortune.js";
import angel from "./datasets/angel.js";
import keywords from "./datasets/keywords.js";
import speed from "./datasets/speed.js";

const setup = {
  words: [...dictionary],
  randomness: 3,
  constraints: {
    minLength: 5,
    maxLength: 10,
    allowDuplicates: true,
  },
  maxSyllables: 10,
  waitTime: 50,
  debug: false,
  showFailed: false,
  prefix: "",
  suffix: "",
};

// Create the Markov chain and specify the order of the chain & input dictionary
// The order (an integer that is greater than 0) indicates how many previous
// letters are taken into account when selecting the next one. A smaller order
// will result in a more randomized, less recognizeable output. Also, a higher
// order will result in words which resemble more closely to those in the original
// dictionary.

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const error = chalk.bold.red;
const warning = chalk.hex("#ffbe0a");
const success = chalk.hex("00FF00");

const chain = new Foswig(setup.randomness, setup.words);

async function run() {
  while (true) {
    await showWord();
  }
}

function showWord() {
  return new Promise(async (resolve, reject) => {
    try {
      const name =
        setup.prefix + (await chain.generate(setup.constraints)) + setup.suffix;

      if (syllable(name) < setup.maxSyllables && (await isAvailable(name))) {
        console.log(success(name + ".com"));
        resolve();
      } else {
        if (setup.showFailed) console.log(warning(name + ".com"));
        reject(new Error("Not fullilling the requirements"));
      }
    } catch (e) {
      reject(e);
    }
  }).catch((e) => {
    if (setup.debug) console.log(error(e));
  });
}

function isAvailable(name) {
  return new Promise(async (resolve, reject) => {
    await new Promise((resolve) => setTimeout(resolve, setup.waitTime));

    await whois.lookup(name + ".com", function (err, data) {
      if (setup.debug) console.log(data && data.substring(0, 70));

      if (
        data &&
        (data.includes("IP Address Has Reached Rate Limit") ||
          data.includes("Exceeded max command rate") ||
          data.includes("Too many queries from your IP"))
      ) {
        console.log(error("Rate limit exceded"));
        setTimeout(() => {
          reject(new Error("Rate limit exceded"));
        }, 10000);
      } else if (
        data &&
        data.includes(`No match for domain "${name.toUpperCase()}.COM"`)
      ) {
        resolve(true);
      } else {
        reject(new Error("Domain not available"));
      }
    });
  }).catch((e) => {
    if (setup.debug) console.log(error(e));
  });
}

process.stdin.on("keypress", (str, key) => {
  if (key.ctrl && key.name === "c") {
    process.exit();
  }
});

run();
