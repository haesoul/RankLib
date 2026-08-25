import { Comparison } from '@/components/features/object/ObjectComparison/ObjectCompare';
import { GradeObject } from "@/realm/models";
import { useQuery } from "@realm/react";
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import Realm from "realm";

export default function ComparisonScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();

  const objectIds = React.useMemo(() => {
    if (!ids) return [];
    const idArray = Array.isArray(ids) ? ids : ids.split(',');
    return idArray.map(id => new Realm.BSON.ObjectId(id));
  }, [ids]);

  const objects = useQuery(GradeObject, (collection) => {
    return collection.filtered("_id IN $0", objectIds);
  }, [objectIds]);

  if (objects.length === 0) {
    return <Text>Загрузка или объекты не выбраны...</Text>;
  }

  return (
    // <ObjectComparison objects={Array.from(objects)} />
    <Comparison objectA={objects[0]} objectB={objects[1]}/>
  );
}