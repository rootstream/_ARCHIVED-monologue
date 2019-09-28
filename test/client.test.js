const chai = require("chai");
const chaiAP = require("chai-as-promised");

const Monologue = require("../index");

chai.use(chaiAP);

describe("Monologue client tests", () => {
  it("should always pass", () => {
    chai.assert.isTrue(true);
  });
});
