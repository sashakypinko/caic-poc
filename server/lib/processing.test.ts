import { describe, it, expect } from 'vitest';
import { mapElevation, mapAspect, mapInstabilityLevel, aggregateReports, collectTexts } from './processing';
import type { FieldReport } from '@shared/schema';

describe('mapElevation', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(mapElevation(null)).toBeNull();
    expect(mapElevation(undefined)).toBeNull();
    expect(mapElevation('')).toBeNull();
  });

  it('decodes HTML entities for above treeline', () => {
    expect(mapElevation('&#62;TL')).toBe('aboveTreeline');
    expect(mapElevation('&gt;TL')).toBe('aboveTreeline');
  });

  it('decodes HTML entities for below treeline', () => {
    expect(mapElevation('&#60;TL')).toBe('belowTreeline');
    expect(mapElevation('&lt;TL')).toBe('belowTreeline');
  });

  it('maps standard CAIC elevation notation', () => {
    expect(mapElevation('>TL')).toBe('aboveTreeline');
    expect(mapElevation('TL')).toBe('nearTreeline');
    expect(mapElevation('<TL')).toBe('belowTreeline');
  });

  it('handles mixed casing', () => {
    expect(mapElevation('>tl')).toBe('aboveTreeline');
    expect(mapElevation('Tl')).toBe('nearTreeline');
    expect(mapElevation('<Tl')).toBe('belowTreeline');
  });

  it('maps synonym elevation terms', () => {
    expect(mapElevation('ATL')).toBe('aboveTreeline');
    expect(mapElevation('ABOVE')).toBe('aboveTreeline');
    expect(mapElevation('ALPINE')).toBe('aboveTreeline');
    expect(mapElevation('BTL')).toBe('belowTreeline');
    expect(mapElevation('BELOW')).toBe('belowTreeline');
    expect(mapElevation('SUB')).toBe('belowTreeline');
    expect(mapElevation('NTL')).toBe('nearTreeline');
    expect(mapElevation('NEAR TREELINE')).toBe('nearTreeline');
  });

  it('returns null for unrecognized input', () => {
    expect(mapElevation('unknown')).toBeNull();
    expect(mapElevation('high')).toBeNull();
  });
});

describe('mapAspect', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(mapAspect(null)).toBeNull();
    expect(mapAspect(undefined)).toBeNull();
    expect(mapAspect('')).toBeNull();
  });

  it('maps single-letter compass directions', () => {
    expect(mapAspect('N')).toBe('N');
    expect(mapAspect('E')).toBe('E');
    expect(mapAspect('S')).toBe('S');
    expect(mapAspect('W')).toBe('W');
  });

  it('maps two-letter compass directions', () => {
    expect(mapAspect('NE')).toBe('NE');
    expect(mapAspect('NW')).toBe('NW');
    expect(mapAspect('SE')).toBe('SE');
    expect(mapAspect('SW')).toBe('SW');
  });

  it('handles mixed casing', () => {
    expect(mapAspect('ne')).toBe('NE');
    expect(mapAspect('Nw')).toBe('NW');
    expect(mapAspect('n')).toBe('N');
  });

  it('prioritizes two-letter over single-letter to prevent prefix collisions', () => {
    expect(mapAspect('NW')).toBe('NW');
    expect(mapAspect('NE')).toBe('NE');
    expect(mapAspect('SW')).toBe('SW');
    expect(mapAspect('SE')).toBe('SE');
  });

  it('extracts aspect from longer strings', () => {
    expect(mapAspect('N facing')).toBe('N');
    expect(mapAspect('NW slope')).toBe('NW');
  });

  it('returns null for unrecognized input', () => {
    expect(mapAspect('unknown')).toBeNull();
    expect(mapAspect('northeast facing')).toBeNull();
  });
});

describe('mapInstabilityLevel', () => {
  it('returns None for null/undefined/empty input', () => {
    expect(mapInstabilityLevel(null)).toBe('None');
    expect(mapInstabilityLevel(undefined)).toBe('None');
    expect(mapInstabilityLevel('')).toBe('None');
  });

  it('maps none/no keywords', () => {
    expect(mapInstabilityLevel('none')).toBe('None');
    expect(mapInstabilityLevel('no')).toBe('None');
    expect(mapInstabilityLevel('None observed')).toBe('None');
  });

  it('maps minor/slight/light keywords', () => {
    expect(mapInstabilityLevel('minor')).toBe('Minor');
    expect(mapInstabilityLevel('slight')).toBe('Minor');
    expect(mapInstabilityLevel('light cracking')).toBe('Minor');
  });

  it('maps moderate/medium keywords', () => {
    expect(mapInstabilityLevel('moderate')).toBe('Moderate');
    expect(mapInstabilityLevel('medium')).toBe('Moderate');
    expect(mapInstabilityLevel('Moderate cracking')).toBe('Moderate');
  });

  it('maps major/heavy/significant keywords', () => {
    expect(mapInstabilityLevel('major')).toBe('Major');
    expect(mapInstabilityLevel('heavy')).toBe('Major');
    expect(mapInstabilityLevel('significant cracking')).toBe('Major');
  });

  it('maps severe/extreme/widespread keywords', () => {
    expect(mapInstabilityLevel('severe')).toBe('Severe');
    expect(mapInstabilityLevel('extreme')).toBe('Severe');
    expect(mapInstabilityLevel('widespread collapsing')).toBe('Severe');
  });

  it('returns None for unrecognized input', () => {
    expect(mapInstabilityLevel('unknown')).toBe('None');
  });
});

describe('aggregateReports', () => {
  it('handles empty reports array', () => {
    const result = aggregateReports([]);
    expect(result.totalReports).toBe(0);
    expect(result.reportsWithAvalanches).toBe(0);
    expect(result.totalAvalanches).toBe(0);
  });

  it('counts total reports correctly', () => {
    const reports: FieldReport[] = [
      { id: '1' } as FieldReport,
      { id: '2' } as FieldReport,
    ];
    const result = aggregateReports(reports);
    expect(result.totalReports).toBe(2);
  });

  it('counts reports with avalanches', () => {
    const reports: FieldReport[] = [
      { id: '1', avalanche_observations: [{ id: 'a1' }] } as FieldReport,
      { id: '2', avalanche_observations: [] } as FieldReport,
      { id: '3', avalanche_observations_count: 2 } as FieldReport,
    ];
    const result = aggregateReports(reports);
    expect(result.reportsWithAvalanches).toBe(2);
    expect(result.totalAvalanches).toBe(3);
  });

  it('aggregates avalanches by elevation', () => {
    const reports: FieldReport[] = [
      {
        id: '1',
        avalanche_observations: [
          { id: 'a1', elevation: '>TL' },
          { id: 'a2', elevation: 'TL' },
          { id: 'a3', elevation: '<TL' },
          { id: 'a4', elevation: '&#62;TL' },
        ],
      } as FieldReport,
    ];
    const result = aggregateReports(reports);
    expect(result.avalanchesByElevation.aboveTreeline).toBe(2);
    expect(result.avalanchesByElevation.nearTreeline).toBe(1);
    expect(result.avalanchesByElevation.belowTreeline).toBe(1);
  });

  it('aggregates avalanches by aspect', () => {
    const reports: FieldReport[] = [
      {
        id: '1',
        avalanche_observations: [
          { id: 'a1', aspect: 'N' },
          { id: 'a2', aspect: 'NW' },
          { id: 'a3', aspect: 'N' },
          { id: 'a4', aspect: 'SE' },
        ],
      } as FieldReport,
    ];
    const result = aggregateReports(reports);
    expect(result.avalanchesByAspect.N).toBe(2);
    expect(result.avalanchesByAspect.NW).toBe(1);
    expect(result.avalanchesByAspect.SE).toBe(1);
  });

  it('aggregates cracking and collapsing counts', () => {
    const reports: FieldReport[] = [
      {
        id: '1',
        snowpack_observations: [
          { cracking: 'minor', collapsing: 'none' },
          { cracking: 'moderate', collapsing: 'minor' },
        ],
      } as FieldReport,
    ];
    const result = aggregateReports(reports);
    expect(result.crackingCounts.Minor).toBe(1);
    expect(result.crackingCounts.Moderate).toBe(1);
    expect(result.collapsingCounts.None).toBe(1);
    expect(result.collapsingCounts.Minor).toBe(1);
  });

  it('increments None for reports without snowpack observations', () => {
    const reports: FieldReport[] = [
      { id: '1' } as FieldReport,
      { id: '2', snowpack_observations: [] } as FieldReport,
    ];
    const result = aggregateReports(reports);
    expect(result.crackingCounts.None).toBe(2);
    expect(result.collapsingCounts.None).toBe(2);
  });
});

describe('collectTexts', () => {
  it('handles empty reports array', () => {
    const result = collectTexts([]);
    expect(result.observations).toEqual([]);
    expect(result.snowpack).toEqual([]);
    expect(result.weather).toEqual([]);
  });

  it('collects observation summaries', () => {
    const reports: FieldReport[] = [
      { id: '1', observation_summary: 'Summary 1' } as FieldReport,
      { id: '2', description: 'Description 2' } as FieldReport,
    ];
    const result = collectTexts(reports);
    expect(result.observations).toEqual(['Summary 1', 'Description 2']);
  });

  it('prefers observation_summary over description', () => {
    const reports: FieldReport[] = [
      { id: '1', observation_summary: 'Summary', description: 'Description' } as FieldReport,
    ];
    const result = collectTexts(reports);
    expect(result.observations).toEqual(['Summary']);
  });

  it('collects snowpack texts from detail and observations', () => {
    const reports: FieldReport[] = [
      {
        id: '1',
        snowpack_detail: { description: 'Snowpack detail' },
        snowpack_observations: [
          { comments: 'Comment 1' },
          { comments: 'Comment 2' },
        ],
      } as FieldReport,
    ];
    const result = collectTexts(reports);
    expect(result.snowpack).toEqual(['Snowpack detail', 'Comment 1', 'Comment 2']);
  });

  it('collects weather texts from detail and observations', () => {
    const reports: FieldReport[] = [
      {
        id: '1',
        weather_detail: { description: 'Weather detail' },
        weather_observations: [
          { comments: 'Weather comment' },
        ],
      } as FieldReport,
    ];
    const result = collectTexts(reports);
    expect(result.weather).toEqual(['Weather detail', 'Weather comment']);
  });

  it('skips empty/whitespace-only strings', () => {
    const reports: FieldReport[] = [
      {
        id: '1',
        observation_summary: '   ',
        snowpack_detail: { description: '' },
        snowpack_observations: [{ comments: '  \n  ' }],
      } as FieldReport,
    ];
    const result = collectTexts(reports);
    expect(result.observations).toEqual([]);
    expect(result.snowpack).toEqual([]);
  });

  it('trims whitespace from collected texts', () => {
    const reports: FieldReport[] = [
      { id: '1', observation_summary: '  Trimmed text  ' } as FieldReport,
    ];
    const result = collectTexts(reports);
    expect(result.observations).toEqual(['Trimmed text']);
  });
});
