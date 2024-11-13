// const getTestData = () => {
//   const testData = [];

//   for (let i = 1; i <= 200; i++) {
//     testData.push({
//       id: i,
//       attributes: {
//         name: "Object " + i,
//         description: "This is object " + i,
//         status: "active",
//       },
//     });
//   }

//   return testData;
// };

class TestService {
  async getClaimTopics() {
    return await this.parseClient.getRecords("ClaimTopic", [], [], ["*"]);
  }

  async getNextClaimTopicId() {
    return Promise.resolve(1);
  }
}

export default TestService;
