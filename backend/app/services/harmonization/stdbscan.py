"""Spatio-Temporal DBSCAN (ST-DBSCAN) Engine for Satellite Fire Hotspot Harmonization.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.

Clusters discrete observations from multiple satellite platforms (Terra, Aqua, Suomi-NPP, NOAA-20/21)
that correspond to the same physical wildfire event based on spatial proximity (eps_s <= 1000m)
and temporal orbital revisit windows (eps_t <= 3-4 hours).
"""

import math
import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime
from sklearn.neighbors import KDTree

logger = logging.getLogger(__name__)


class DisjointSetUnion:
    """Disjoint Set Union (DSU) / Union-Find data structure with path compression and rank heuristic."""

    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, i: int) -> int:
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i: int, j: int) -> bool:
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1
            return True
        return False


class STDBSCAN:
    """High-performance Spatio-Temporal Clustering Engine.
    
    Attributes:
        eps_spatial_m (float): Spatial search radius in meters (default: 1000.0 m, radius of MODIS footprint).
        eps_temporal_sec (float): Temporal search window in seconds (default: 14400.0 s = 4.0 hours).
        min_samples (int): Minimum cluster size. 1 allows isolated detections to form individual events.
    """

    def __init__(
        self,
        eps_spatial_m: float = 1000.0,
        eps_temporal_sec: float = 14400.0,
        min_samples: int = 1,
    ):
        self.eps_spatial_m = float(eps_spatial_m)
        self.eps_temporal_sec = float(eps_temporal_sec)
        self.min_samples = int(min_samples)

    @staticmethod
    def project_to_meters(lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
        """Projects latitude/longitude coordinates to planar meters using Equirectangular projection.
        
        Centered at regional mean latitude for minimal distortion across regional extents (e.g. Bolivia).
        """
        mean_lat_rad = math.radians(float(np.mean(lats)))
        cos_mean_lat = math.cos(mean_lat_rad)
        
        # 1 degree of latitude ~ 111,320 meters
        y_meters = lats * 111320.0
        # 1 degree of longitude scales with cos(mean_latitude)
        x_meters = lons * 111320.0 * cos_mean_lat
        
        return np.column_stack([x_meters, y_meters])

    @staticmethod
    def extract_timestamps(datetimes: Union[pd.Series, List[Any], np.ndarray]) -> np.ndarray:
        """Converts diverse datetime representations into epoch seconds as float64 array."""
        converted = pd.to_datetime(datetimes)
        # In pandas 2.0+, units can be s, ms, us, ns. Converting to datetime64[s] first guarantees seconds.
        return converted.astype("datetime64[s]").astype("int64").to_numpy(dtype=float)

    def fit_predict(
        self,
        df: pd.DataFrame,
        lat_col: str = "latitude",
        lon_col: str = "longitude",
        time_col: str = "acq_datetime",
    ) -> np.ndarray:
        """Clusters spatial fire detections in space and time.
        
        Args:
            df: Pandas DataFrame containing hotspot coordinates and timestamps.
            lat_col: Name of latitude column.
            lon_col: Name of longitude column.
            time_col: Name of datetime/timestamp column.
            
        Returns:
            np.ndarray: Array of integer cluster IDs matching input row count.
                        Noise points receive -1 if min_samples > 1.
        """
        n_samples = len(df)
        if n_samples == 0:
            return np.array([], dtype=int)

        lats = df[lat_col].to_numpy(dtype=float)
        lons = df[lon_col].to_numpy(dtype=float)
        times = self.extract_timestamps(df[time_col])

        # Step 1: Project coordinates to metric space
        coords_meters = self.project_to_meters(lats, lons)

        # Step 2: Build spatial KDTree
        kdtree = KDTree(coords_meters, metric="euclidean")

        # Step 3: Query all spatial neighbors within eps_spatial_m
        spatial_neighbors = kdtree.query_radius(coords_meters, r=self.eps_spatial_m)

        # Step 4: Spatio-temporal graph linkage via Disjoint Set Union (DSU)
        dsu = DisjointSetUnion(n_samples)

        for i in range(n_samples):
            t_i = times[i]
            for neighbor_idx in spatial_neighbors[i]:
                if neighbor_idx > i:  # Avoid redundant evaluations
                    t_neighbor = times[neighbor_idx]
                    if abs(t_i - t_neighbor) <= self.eps_temporal_sec:
                        dsu.union(i, neighbor_idx)

        # Step 5: Gather root components
        root_to_cluster: Dict[int, int] = {}
        cluster_sizes: Dict[int, int] = {}
        roots = np.zeros(n_samples, dtype=int)

        for i in range(n_samples):
            r = dsu.find(i)
            roots[i] = r
            cluster_sizes[r] = cluster_sizes.get(r, 0) + 1

        # Step 6: Map to contiguous 0-based cluster IDs (assign -1 to clusters < min_samples)
        current_cluster_id = 0
        cluster_labels = np.full(n_samples, -1, dtype=int)

        for i in range(n_samples):
            r = roots[i]
            if cluster_sizes[r] >= self.min_samples:
                if r not in root_to_cluster:
                    root_to_cluster[r] = current_cluster_id
                    current_cluster_id += 1
                cluster_labels[i] = root_to_cluster[r]
            else:
                cluster_labels[i] = -1

        logger.info(
            f"ST-DBSCAN completed: {n_samples} points clustered into {current_cluster_id} "
            f"distinct wildfire events (eps_s={self.eps_spatial_m}m, eps_t={self.eps_temporal_sec/3600.0}h)"
        )
        return cluster_labels
