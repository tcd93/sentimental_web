export interface SentimentListItem {
    keyword: string;
    avg_pos: number | null;
    avg_neg: number | null;
    avg_mix: number | null;
    avg_neutral: number | null;
    pos_count: number | null;
    neg_count: number | null;
    mix_count: number | null;
    neutral_count: number | null;
    count: number;
  }