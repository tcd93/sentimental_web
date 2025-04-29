import {
  ATHENA_DB,
  ATHENA_TABLE,
} from "@/lib/config";
import {
  DailySentimentData,
  DailySentimentDataSchema,
} from "@/lib/types/DailySentimentData";
import { jsonResponse } from "../../response";
import { getCachedData, queryAthena, setCachedData } from "@/app/helper";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (
    !startDate ||
    !endDate ||
    !dateRegex.test(startDate) ||
    !dateRegex.test(endDate)
  ) {
    return jsonResponse(
      {
        error:
          "Missing or invalid required query parameters: startDate and endDate must be in YYYY-MM-DD format",
      },
      400
    );
  }
  if (new Date(startDate) > new Date(endDate)) {
    return jsonResponse(
      { error: "Invalid date range: startDate cannot be after endDate" },
      400
    );
  }

  const cacheKey = `sentiment-daily-data-v1:from${startDate}-to${endDate}`;

  const cachedData = await getCachedData<DailySentimentData>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const whereClauses = [
      `CAST(created_at AS DATE) >= date('${startDate}')`,
      `CAST(created_at AS DATE) <= date('${endDate}')`,
    ];

    const query = `
        SELECT
            keyword,
            CAST(created_at AS DATE) AS date,
            AVG(sentiment_score_positive) AS avg_pos,
            AVG(sentiment_score_negative) AS avg_neg,
            AVG(sentiment_score_mixed) AS avg_mix,
            AVG(sentiment_score_neutral) AS avg_neutral,
            SUM(CASE WHEN sentiment = 'POSITIVE' THEN 1 ELSE 0 END) AS pos_count,
            SUM(CASE WHEN sentiment = 'NEGATIVE' THEN 1 ELSE 0 END) AS neg_count,
            SUM(CASE WHEN sentiment = 'MIXED' THEN 1 ELSE 0 END) AS mix_count,
            SUM(CASE WHEN sentiment = 'NEUTRAL' THEN 1 ELSE 0 END) AS neutral_count,
            COUNT(1) AS total_count
        FROM
            "${ATHENA_DB}"."${ATHENA_TABLE}"
        WHERE
            ${whereClauses.join(" AND \n            ")}
        GROUP BY
            keyword, CAST(created_at AS DATE)
        ORDER BY
            keyword, date;
    `;

    const results = await queryAthena(query, DailySentimentDataSchema);

    await setCachedData<DailySentimentData>(cacheKey, results);

    return jsonResponse({ data: results });
  } catch (error) {
    console.error("Athena Query Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return jsonResponse(
      { error: "Failed to query Athena", details: errorMessage },
      500
    );
  }
}
