// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/benchmark
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import * as byline from 'byline';
import {ChildProcess, spawn} from 'child_process';
import * as pEvent from 'p-event';
import {Autocannon, EndpointStats} from './autocannon';
import {Client} from './client';
import {scenarios} from './scenarios';

export interface Scenario {
  setup(client: Client): Promise<void>;
  execute(autocannon: Autocannon): Promise<EndpointStats>;
}

export type ScenarioFactory = new () => Scenario;

export interface Options {
  /**
   * How long to run the benchmark - time in seconds.
   * Default: 30 seconds.
   */
  duration: number;

  /**
   * Optional callback to log progress.
   */
  logger: (title: string, stats: EndpointStats) => void;
}

export interface Result {
  [scenario: string]: EndpointStats;
}

export class Benchmark {
  private options: Options;
  private worker: ChildProcess;
  private url: string;

  constructor(options?: Partial<Options>) {
    this.options = Object.assign(
      {
        duration: 30 /* seconds */,
        logger: function() {},
      },
      options,
    );
  }

  async run(): Promise<Result> {
    const result: Result = {};
    for (const name in scenarios) {
      result[name] = await this.runScenario(name, scenarios[name]);
    }
    return result;
  }

  async runScenario(
    name: string,
    factory: ScenarioFactory,
  ): Promise<EndpointStats> {
    const {worker, url} = await this.startWorker();
    const client = new Client(url);
    const autocannon = new Autocannon(url, this.options.duration);

    const runner = new factory();
    await runner.setup(client);
    await client.ping();
    const result = await runner.execute(autocannon);

    worker.kill();
    await pEvent(worker, 'close');

    this.options.logger(name, result);

    return result;
  }

  startWorker() {
    return new Promise<{worker: ChildProcess; url: string}>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          ['--expose-gc', require.resolve('./worker')],
          {
            stdio: ['pipe', 'pipe', 'inherit'],
          },
        );

        child.once('error', reject);
        child.once('exit', (code, signal) =>
          reject(new Error(`Child exited with code ${code} signal ${signal}`)),
        );

        const reader = byline.createStream(child.stdout);
        reader.once('data', data =>
          resolve({worker: child, url: data.toString()}),
        );
      },
    );
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
