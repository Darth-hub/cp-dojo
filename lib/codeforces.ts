const BASE_URL = "https://codeforces.com/api";

const cfFetch = async (endpoint: string) => {
  const res = await fetch(`${BASE_URL}/${endpoint}`);
  const data = await res.json();
  if (data.status !== "OK") {
    throw new Error(data.comment || "CF API error");
  }
  return data.result;
};

export default cfFetch;
