/**
 * Script to generate problems.json file
 * containing problems for the nearly next 7 years
 */

const axios = require("axios");
const fs = require("fs");

const url = "https://codeforces.com/api/problemset.problems";

const getProblems = async () => {
  try {
    const response = await axios.get(url);
    return response.data.result.problems.filter((problem) => problem.rating);
  } catch (error) {
    console.error(error);
  }
};

getProblems().then((data) => {
  const ratings = [...new Set(data.map((problem) => problem.rating))];
  console.log(ratings);
  const problems = {
    level1: {},
    level2: {},
    level3: {},
  };
  let index1 = 0,
    index2 = 0,
    index3 = 0;
  data.forEach((problem) => {
    if (problem.rating <= 1500) {
      const date = new Date(Date.now() + index1 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      index1++;
      problems.level1[date] = `${problem.contestId}/${problem.index}`;
    } else if (problem.rating <= 2200) {
      const date = new Date(Date.now() + index2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      index2++;
      problems.level2[date] = `${problem.contestId}/${problem.index}`;
    } else {
      const date = new Date(Date.now() + index3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      index3++;
      problems.level3[date] = `${problem.contestId}/${problem.index}`;
    }
  });

  // shuffle problems
  const keys1 = Object.keys(problems.level1);
  const keys2 = Object.keys(problems.level2);
  const keys3 = Object.keys(problems.level3);

  for (let i = keys1.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    const temp = problems.level1[keys1[i]];
    problems.level1[keys1[i]] = problems.level1[keys1[j]];
    problems.level1[keys1[j]] = temp;
  }

  for (let i = keys2.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    const temp = problems.level2[keys2[i]];
    problems.level2[keys2[i]] = problems.level2[keys2[j]];
    problems.level2[keys2[j]] = temp;
  }

  for (let i = keys3.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    const temp = problems.level3[keys3[i]];
    problems.level3[keys3[i]] = problems.level3[keys3[j]];
    problems.level3[keys3[j]] = temp;
  }

  fs.writeFileSync("problems.json", JSON.stringify(problems));
});
