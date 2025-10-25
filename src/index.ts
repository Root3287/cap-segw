import cds, {CSN} from "@sap/cds";

const LOG = cds.log("segw");

export default (csn: any, options: any)  => {
	LOG.info(csn);
	return {};
}