// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/benchmark
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Benchmark} from '..';

describe('Benchmark', function() {
  // Unfortunately, autocannon always runs for at least one second.
  // tslint:disable-next-line:no-invalid-this
  this.timeout(10000);

  it('works', async () => {
    const bench = new Benchmark({
      duration: 0.01 /*seconds*/,
    });
    await bench.run();
  });
});
