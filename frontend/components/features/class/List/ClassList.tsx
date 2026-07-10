
import ClassCard from "@/components/features/class/Card/ClassCard";
import { Colors } from "@/CONSTANTS";
import { ClassOfGrading } from "@/realm/models";
import { useQuery } from "@realm/react";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
type ShowAllClassesProps = {
  onSelectClass: (cls: ClassOfGrading) => void;
};


const ShowAllClasses = ({onSelectClass}: ShowAllClassesProps) => {

  const gradeClasses = useQuery(ClassOfGrading).sorted('priority', false)
  
  const renderItem = ({ item, index }: { item: ClassOfGrading; index: number }) => (
    <ClassCard 
      item={item} 
      index={index} 
      onPress={onSelectClass} 
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={gradeClasses}
        keyExtractor={(item) => item._id.toHexString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20, gap: 5 }}
        extraData={gradeClasses}
      />
    </View>
  );
};

export default ShowAllClasses;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceDarker,
    padding: 0,
  },

});