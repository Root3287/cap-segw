'use strict';

const cds = require(
  require.resolve('@sap/cds', { paths: [process.cwd()] })
);
const SEGWCompilerHandler = require("./dist");

cds.compile.to.segw = (csn, options) => SEGWCompilerHandler.default(csn, options);

// TODO: Expose a build service
// cds.build?.register?.('segw', class SEGWBuildPlugin extends cds.build.Plugin {
//   static hasTask() {
//     return true;
//   }

//   init() {
//   	logger.info("SEGW Build Plugin init")
//     this.task.dest = path.join(this.task.dest, 'pg');
//   }
  
//   async build() {
//     logger.info("SEGW Build")
//   }
// });