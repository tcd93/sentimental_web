export interface AggregatedSentimentItem {
  group_key: string; // Can be keyword, date, or sentiment, or keyword_date
  avg_pos: number;
  avg_neg: number;
  avg_mix: number;
  avg_neutral: number;
  pos_count: number;
  neg_count: number;
  mix_count: number;
  neutral_count: number;
  count: number; // total count of analyzed posts
  active_days_of_keyword: number; // number of days the keyword has been active
} 