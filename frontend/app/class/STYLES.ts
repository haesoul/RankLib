import { Colors } from "@/CONSTANTS";
import { StyleSheet } from "react-native";



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 3,
  },
  RNModalContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 20,
  },
  topSpacing: {
    marginTop: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F5F5F5",
    marginBottom: 12,
    textAlign: "center",
  },

  buttonText: {
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  buttonPrimary: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContainer: {
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 16,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: '7%'
    
  },
  tagContainer: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,

  },
  tagInactive: {
    backgroundColor: '#989ba0ff',
    borderColor: '#E5E7EB',  
  },
  tagActive: {
    backgroundColor: '#3B82F6', 
    borderColor: '#3B82F6',
  },
  baseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInactive: {
    color: '#374151',
    fontWeight: '600',
  },
  textActive: {
    color: '#FFFFFF', 
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10, 
    width: '100%',
  },
  line: {
    flex: 1,            
    height: 1,
    backgroundColor: '#555', 
    opacity: 0.5,
  },
  sectionHeaderText: {
    color: '#aaa',          
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,    
    marginHorizontal: 15,   
    fontFamily: 'System', 
  },
});

export default styles