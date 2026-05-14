import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5000";

export async function analyzeMeeting(payload: any) {
  const response = await axios.post(
    `${API_BASE}/api/meetings/analyze`,
    payload
  );

  return response.data;
}