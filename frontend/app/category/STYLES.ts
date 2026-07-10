





import { StyleSheet } from "react-native";



const styles = StyleSheet.create({
  mainConatiner: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    padding: 0,
    
  },
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    padding: 16,
    marginTop: 25
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  addBtn: {
    backgroundColor: "#007bff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 10,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",

  },

  categoryBox: {
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: 'wrap',  
    marginBottom: 6,
  },

  catName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  smallBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 4,
  },
  smallBtnText: {
    color: "#fff",
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: "#b30000",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteText: {
    color: "#fff",
    fontSize: 14,
  },
  subRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#262626",
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
  },
  subName: {
    fontSize: 15,
    color: "#ddd",
    flex: 1, 
  },
  deleteSmall: {
    backgroundColor: "#660000",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noSubs: {
    color: "#555",
    fontSize: 14,
    marginTop: 6,
    fontStyle: "italic",
  },
  buttonText: {
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  buttonPrimary: {
    backgroundColor: "#1E1E1E",
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
    backgroundColor: "#1A1A1A",
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
  block: {
    backgroundColor: "#1a1a1a", 
    padding: 16,               
    borderRadius: 12,         
    marginBottom: 15,           
    borderWidth: 1,           
    borderColor: "#2a2a2a",   
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,  
             
  },
  
  addCatBtn: {
    backgroundColor: "#007bff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,        
    width: 40,           
    justifyContent: "center",
    alignItems: "center",
  },
  textWrapper: {
    flex: 1,      
    marginRight: 8,     
    maxWidth: '65%',   
  },
  buttonsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,   
  },
  buttonsBelow: {
    marginTop: 8,        
    flexDirection: 'row',
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  categoryBoxSelected: {
    borderColor: "#FFD700", 
    backgroundColor: "#252520", 
  },
  categoryBoxActive: {
    borderColor: "#4A90E2",
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.5,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',

  },
  iconBtn: {
    width: 38,
    height: 38,
    paddingHorizontal: 0, 
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#444',
    marginLeft: 4,
  },
  subListContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },

  subActions: {
    flexDirection: 'row',
    gap: 12,
  },
  miniBtn: {
    padding: 6,
  },

  inputContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  submitBtn: {
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default styles