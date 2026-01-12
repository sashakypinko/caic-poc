import { describe, it, expect } from 'vitest';
import {
  avalancheObservationSchema,
  snowpackObservationSchema,
  weatherObservationSchema,
  fieldReportSchema,
  aggregatedDataSchema,
  synthesizedSummariesSchema,
  reportResponseSchema,
  chatMessageSchema,
  chatRequestSchema,
  chatResponseSchema,
  fetchReportsRequestSchema,
  elevationBandSchema,
  aspectCountsSchema,
  instabilityCountsSchema,
} from './schema';

describe('avalancheObservationSchema', () => {
  it('parses valid avalanche observation', () => {
    const result = avalancheObservationSchema.parse({
      id: 1,
      aspect: 'N',
      elevation: '>TL',
    });
    expect(result.id).toBe(1);
    expect(result.aspect).toBe('N');
  });

  it('handles null fields', () => {
    const result = avalancheObservationSchema.parse({
      aspect: null,
      elevation: null,
    });
    expect(result.aspect).toBeNull();
  });

  it('handles empty object', () => {
    const result = avalancheObservationSchema.parse({});
    expect(result).toBeDefined();
  });
});

describe('snowpackObservationSchema', () => {
  it('parses valid snowpack observation', () => {
    const result = snowpackObservationSchema.parse({
      id: 1,
      cracking: 'minor',
      collapsing: 'none',
      comments: 'Test comment',
    });
    expect(result.cracking).toBe('minor');
  });

  it('handles null values', () => {
    const result = snowpackObservationSchema.parse({
      cracking: null,
      collapsing: null,
    });
    expect(result.cracking).toBeNull();
  });
});

describe('weatherObservationSchema', () => {
  it('parses valid weather observation', () => {
    const result = weatherObservationSchema.parse({
      sky_cover: 'clear',
      air_temperature: 25,
      wind_direction: 'NW',
    });
    expect(result.air_temperature).toBe(25);
  });

  it('handles null temperature', () => {
    const result = weatherObservationSchema.parse({
      air_temperature: null,
    });
    expect(result.air_temperature).toBeNull();
  });
});

describe('fieldReportSchema', () => {
  it('parses valid field report', () => {
    const result = fieldReportSchema.parse({
      id: 123,
      type: 'observation',
      backcountry_zone: 'Vail',
    });
    expect(result.id).toBe(123);
    expect(result.avalanche_observations).toEqual([]);
  });

  it('defaults arrays to empty', () => {
    const result = fieldReportSchema.parse({ id: 1 });
    expect(result.avalanche_observations).toEqual([]);
    expect(result.snowpack_observations).toEqual([]);
    expect(result.weather_observations).toEqual([]);
    expect(result.avalanche_observations_count).toBe(0);
  });

  it('rejects missing id', () => {
    expect(() => fieldReportSchema.parse({})).toThrow();
  });

  it('parses nested observations', () => {
    const result = fieldReportSchema.parse({
      id: 1,
      avalanche_observations: [{ aspect: 'N', elevation: 'TL' }],
      snowpack_observations: [{ cracking: 'minor' }],
    });
    expect(result.avalanche_observations.length).toBe(1);
    expect(result.snowpack_observations.length).toBe(1);
  });
});

describe('elevationBandSchema', () => {
  it('parses with defaults', () => {
    const result = elevationBandSchema.parse({});
    expect(result.aboveTreeline).toBe(0);
    expect(result.nearTreeline).toBe(0);
    expect(result.belowTreeline).toBe(0);
  });

  it('parses with values', () => {
    const result = elevationBandSchema.parse({
      aboveTreeline: 5,
      nearTreeline: 3,
      belowTreeline: 2,
    });
    expect(result.aboveTreeline).toBe(5);
  });
});

describe('aspectCountsSchema', () => {
  it('parses with defaults', () => {
    const result = aspectCountsSchema.parse({});
    expect(result.N).toBe(0);
    expect(result.NE).toBe(0);
    expect(result.NW).toBe(0);
  });

  it('parses all directions', () => {
    const result = aspectCountsSchema.parse({
      N: 1, NE: 2, E: 3, SE: 4, S: 5, SW: 6, W: 7, NW: 8,
    });
    expect(result.N).toBe(1);
    expect(result.NW).toBe(8);
  });
});

describe('instabilityCountsSchema', () => {
  it('parses with defaults', () => {
    const result = instabilityCountsSchema.parse({});
    expect(result.None).toBe(0);
    expect(result.Severe).toBe(0);
  });

  it('parses all levels', () => {
    const result = instabilityCountsSchema.parse({
      None: 10, Minor: 5, Moderate: 3, Major: 2, Severe: 1,
    });
    expect(result.None).toBe(10);
    expect(result.Severe).toBe(1);
  });
});

describe('aggregatedDataSchema', () => {
  it('parses complete aggregated data', () => {
    const result = aggregatedDataSchema.parse({
      totalReports: 10,
      reportsWithAvalanches: 5,
      totalAvalanches: 8,
      avalanchesByElevation: {},
      avalanchesByAspect: {},
      crackingCounts: {},
      collapsingCounts: {},
    });
    expect(result.totalReports).toBe(10);
  });

  it('rejects missing required fields', () => {
    expect(() => aggregatedDataSchema.parse({})).toThrow();
  });
});

describe('synthesizedSummariesSchema', () => {
  it('parses valid summaries', () => {
    const result = synthesizedSummariesSchema.parse({
      observationSummary: 'Obs summary',
      snowpackSummary: 'Snow summary',
      weatherSummary: 'Weather summary',
    });
    expect(result.observationSummary).toBe('Obs summary');
  });

  it('rejects missing fields', () => {
    expect(() => synthesizedSummariesSchema.parse({
      observationSummary: 'Only one',
    })).toThrow();
  });
});

describe('reportResponseSchema', () => {
  it('parses complete response', () => {
    const result = reportResponseSchema.parse({
      date: '2025-01-12',
      aggregatedData: {
        totalReports: 5,
        reportsWithAvalanches: 2,
        totalAvalanches: 3,
        avalanchesByElevation: {},
        avalanchesByAspect: {},
        crackingCounts: {},
        collapsingCounts: {},
      },
      summaries: {
        observationSummary: 'Obs',
        snowpackSummary: 'Snow',
        weatherSummary: 'Weather',
      },
    });
    expect(result.date).toBe('2025-01-12');
  });

  it('allows optional rawReports', () => {
    const result = reportResponseSchema.parse({
      date: '2025-01-12',
      aggregatedData: {
        totalReports: 0,
        reportsWithAvalanches: 0,
        totalAvalanches: 0,
        avalanchesByElevation: {},
        avalanchesByAspect: {},
        crackingCounts: {},
        collapsingCounts: {},
      },
      summaries: {
        observationSummary: '',
        snowpackSummary: '',
        weatherSummary: '',
      },
      rawReports: [{ id: 1 }],
    });
    expect(result.rawReports?.length).toBe(1);
  });
});

describe('chatMessageSchema', () => {
  it('parses user message', () => {
    const result = chatMessageSchema.parse({
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: '2025-01-12T12:00:00Z',
    });
    expect(result.role).toBe('user');
  });

  it('parses assistant message', () => {
    const result = chatMessageSchema.parse({
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there',
      timestamp: '2025-01-12T12:00:01Z',
    });
    expect(result.role).toBe('assistant');
  });

  it('rejects invalid role', () => {
    expect(() => chatMessageSchema.parse({
      id: '1',
      role: 'system',
      content: 'test',
      timestamp: 'now',
    })).toThrow();
  });
});

describe('chatRequestSchema', () => {
  it('parses message only', () => {
    const result = chatRequestSchema.parse({
      message: 'What is the avalanche danger?',
    });
    expect(result.message).toBe('What is the avalanche danger?');
    expect(result.context).toBeUndefined();
  });

  it('parses with optional context', () => {
    const result = chatRequestSchema.parse({
      message: 'Question',
      context: {
        totalReports: 5,
        reportsWithAvalanches: 2,
        totalAvalanches: 3,
        avalanchesByElevation: {},
        avalanchesByAspect: {},
        crackingCounts: {},
        collapsingCounts: {},
      },
    });
    expect(result.context?.totalReports).toBe(5);
  });
});

describe('chatResponseSchema', () => {
  it('parses valid response', () => {
    const result = chatResponseSchema.parse({
      response: 'The danger is considerable.',
    });
    expect(result.response).toBe('The danger is considerable.');
  });

  it('rejects missing response', () => {
    expect(() => chatResponseSchema.parse({})).toThrow();
  });
});

describe('fetchReportsRequestSchema', () => {
  it('parses valid date', () => {
    const result = fetchReportsRequestSchema.parse({
      date: '2025-01-12',
    });
    expect(result.date).toBe('2025-01-12');
  });

  it('rejects missing date', () => {
    expect(() => fetchReportsRequestSchema.parse({})).toThrow();
  });

  it('accepts any string as date', () => {
    const result = fetchReportsRequestSchema.parse({
      date: 'not-a-date',
    });
    expect(result.date).toBe('not-a-date');
  });
});
